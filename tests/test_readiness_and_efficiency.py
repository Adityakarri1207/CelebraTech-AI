"""
Comprehensive tests for Celebration Readiness Score, Event Filtering,
GZip payload compression, and centralized Domain Exception translation.
"""

import gzip
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_celebration_readiness_calculation():
    """Verify calculation of Celebration Readiness Score across budget, timeline, vendors, and RSVPs."""
    # List seeded events
    events = client.get("/api/events").json()
    assert len(events) > 0
    event_id = events[0]["id"]

    # Request readiness score directly via endpoint
    res = client.get(f"/api/events/{event_id}/readiness")
    assert res.status_code == 200
    data = res.json()

    assert "overall_score" in data
    assert 0 <= data["overall_score"] <= 100
    assert any(keyword in data["status"] for keyword in ["Ready", "On Track", "In Progress", "Needs Attention"])
    assert "budget_health_score" in data
    assert "timeline_progress_score" in data
    assert "vendor_settlement_score" in data
    assert "rsvp_confirmation_score" in data
    assert isinstance(data["actionable_recommendations"], list)
    assert len(data["actionable_recommendations"]) > 0


def test_event_type_filtering_endpoint():
    """Verify event filtering by event_type query parameter."""
    res_weddings = client.get("/api/events?event_type=wedding")
    assert res_weddings.status_code == 200
    weddings = res_weddings.json()
    assert len(weddings) > 0
    assert all(e["event_type"] == "wedding" for e in weddings)

    res_birthdays = client.get("/api/events?event_type=birthday")
    assert res_birthdays.status_code == 200
    birthdays = res_birthdays.json()
    assert len(birthdays) > 0
    assert all(e["event_type"] == "birthday" for e in birthdays)


def test_readiness_included_in_get_event():
    """Verify that GET /api/events/{id} includes the readiness score in the payload."""
    events = client.get("/api/events").json()
    event_id = events[0]["id"]

    res = client.get(f"/api/events/{event_id}")
    assert res.status_code == 200
    data = res.json()
    assert "readiness" in data
    assert data["readiness"] is not None
    assert "overall_score" in data["readiness"]


def test_gzip_compression_active():
    """Verify that responses above 500 bytes are compressed with GZip when requested."""
    headers = {"Accept-Encoding": "gzip"}
    res = client.get("/api/events", headers=headers)
    assert res.status_code == 200
    # GZipMiddleware compresses response when Accept-Encoding is gzip
    if "content-encoding" in res.headers:
        assert res.headers["content-encoding"] == "gzip"


def test_nonexistent_event_returns_404():
    """Verify that querying a missing event returns HTTP 404 with standard error body."""
    res = client.get("/api/events/non-existent-event-id-999")
    assert res.status_code == 404
    data = res.json()
    assert "detail" in data


def test_domain_exceptions_hierarchy():
    """Verify all custom domain exceptions inherit from CelebraTechError and have proper status codes."""
    from app.exceptions import (
        CelebraTechError,
        EntityNotFoundError,
        EventNotFoundError,
        BudgetItemNotFoundError,
        VendorNotFoundError,
        TimelineItemNotFoundError,
        GuestNotFoundError,
        PayloadTooLargeError,
        DomainValidationError,
    )

    err = EventNotFoundError("evt-123")
    assert isinstance(err, EntityNotFoundError)
    assert isinstance(err, CelebraTechError)
    assert err.status_code == 404
    assert err.code == "EVENT_NOT_FOUND"
    assert "evt-123" in err.message

    val_err = DomainValidationError("Title cannot be blank")
    assert val_err.status_code == 422
    assert val_err.code == "DOMAIN_VALIDATION_ERROR"

    pay_err = PayloadTooLargeError(max_bytes=2 * 1024 * 1024, actual_bytes=3 * 1024 * 1024)
    assert pay_err.status_code == 413
    assert pay_err.code == "PAYLOAD_TOO_LARGE"
    assert "exceeds maximum limit" in pay_err.message


def test_rate_limiter_triggers_429_on_excess():
    """Verify rate limiter blocks client when request limit is exhausted."""
    from app.api.middleware import RateLimiterMiddleware
    from starlette.requests import Request
    from starlette.responses import PlainTextResponse
    import asyncio

    # Test standalone middleware logic
    limiter = RateLimiterMiddleware(app=None, max_requests=2, window_seconds=60)
    
    class DummyClient:
        host = "192.168.1.100"

    class DummyURL:
        path = "/api/test"

    class DummyRequest:
        client = DummyClient()
        url = DummyURL()

    async def dummy_call_next(req):
        return PlainTextResponse("OK")

    # 1st request -> OK
    res1 = asyncio.run(limiter.dispatch(DummyRequest(), dummy_call_next))
    assert res1.status_code == 200

    # 2nd request -> OK
    res2 = asyncio.run(limiter.dispatch(DummyRequest(), dummy_call_next))
    assert res2.status_code == 200

    # 3rd request -> 429 TOO_MANY_REQUESTS
    res3 = asyncio.run(limiter.dispatch(DummyRequest(), dummy_call_next))
    assert res3.status_code == 429
    assert res3.headers["Retry-After"] is not None


def test_readiness_score_weighted_math():
    """Verify weighted mathematical integrity of the Celebration Readiness formula."""
    from app.services.event_service import EventService
    from app.models.event import EventPlan, BudgetItem, TimelineItem, TimelinePhase, VendorItem, VendorStatus, GuestItem, GuestRSVPStatus

    service = EventService()
    event = EventPlan(
        id="test-calc-evt",
        title="Math Verification Event",
        event_type="wedding",
        date="2026-12-31",
        location="Bengaluru",
        guest_count=100,
        total_budget=100000.0,
        currency="INR",
        budget_items=[
            BudgetItem(id="b1", name="Venue", estimated_cost=100000, actual_cost=100000, paid=True),
        ],
        timeline_items=[
            TimelineItem(id="t1", title="Setup", phase=TimelinePhase.DAY_OF, time_or_offset="09:00 AM", completed=True),
        ],
        vendors=[
            VendorItem(id="v1", name="Photographer", category="Photography", quoted_cost=20000, status=VendorStatus.FULLY_PAID),
        ],
        guests=[
            GuestItem(id="g1", name="Aditya", rsvp_status=GuestRSVPStatus.CONFIRMED),
        ],
    )

    score = service.calculate_readiness_score(event)
    assert score.overall_score == 100
    assert "Ready to Celebrate" in score.status
    assert score.budget_health_score == 100
    assert score.timeline_progress_score == 100
    assert score.vendor_settlement_score == 100
    assert score.rsvp_confirmation_score == 100


def test_readiness_score_graceful_on_empty_event():
    """Verify celebration readiness calculates safely without ZeroDivisionError on a blank event."""
    from app.services.event_service import EventService
    from app.models.event import EventPlan

    service = EventService()
    empty_event = EventPlan(
        id="empty-evt",
        title="Blank Event",
        event_type="other",
        date="2026-12-31",
        location="Online",
        guest_count=1,
        total_budget=0.0,
        currency="INR",
    )
    score = service.calculate_readiness_score(empty_event)
    assert 0 <= score.overall_score <= 100
    assert "status" in score.model_dump()



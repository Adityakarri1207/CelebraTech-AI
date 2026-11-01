"""
Integration tests for FastAPI event, guest, and export endpoints using TestClient.
"""

import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Ensure system health check responds 200 OK."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_list_events():
    """Ensure pre-seeded showcase events are present."""
    response = client.get("/api/events")
    assert response.status_code == 200
    events = response.json()
    assert len(events) >= 3
    titles = [e["title"] for e in events]
    assert any("Wedding" in t for t in titles)
    assert any("Birthday" in t for t in titles)
    assert any("Community" in t or "Harvest" in t for t in titles)


def test_create_and_delete_event():
    """Test full event creation and deletion lifecycle."""
    payload = {
        "title": "Spring Charity Gala 2026",
        "event_type": "community",
        "date": "2026-05-20",
        "location": "City Arts Center",
        "guest_count": 150,
        "total_budget": 1500000.0,
        "currency": "INR",
        "theme": "Starlight Giving",
        "vibe": "Inspiring & Elegant",
        "generate_ai_plan": True,
    }
    create_res = client.post("/api/events", json=payload)
    assert create_res.status_code == 201
    event = create_res.json()
    event_id = event["id"]
    assert event["title"] == "Spring Charity Gala 2026"
    assert len(event["budget_items"]) > 0
    assert len(event["guests"]) > 0

    # Get details
    get_res = client.get(f"/api/events/{event_id}")
    assert get_res.status_code == 200

    # Budget summary
    summary_res = client.get(f"/api/events/{event_id}/budget-summary")
    assert summary_res.status_code == 200
    assert summary_res.json()["total_budget"] == 1500000.0

    # Exports
    md_res = client.get(f"/api/events/{event_id}/export/markdown")
    assert md_res.status_code == 200
    assert "Master Event Plan" in md_res.text

    csv_res = client.get(f"/api/events/{event_id}/export/budget-csv")
    assert csv_res.status_code == 200
    assert "Category,Item Name" in csv_res.text

    guest_csv_res = client.get(f"/api/events/{event_id}/export/guests-csv")
    assert guest_csv_res.status_code == 200
    assert "Guest Name,Party Size" in guest_csv_res.text

    # Delete
    del_res = client.delete(f"/api/events/{event_id}")
    assert del_res.status_code == 204

    # Verify 404 after deletion
    get_after_del = client.get(f"/api/events/{event_id}")
    assert get_after_del.status_code == 404


def test_budget_item_crud():
    """Test adding and deleting individual budget line item."""
    events = client.get("/api/events").json()
    target_id = events[0]["id"]

    new_item = {
        "category": "Decor & Floral",
        "name": "Custom Fairy Light Curtain",
        "estimated_cost": 350.0,
        "actual_cost": 320.0,
        "paid": True,
        "notes": "Includes setup labor",
    }
    add_res = client.post(f"/api/events/{target_id}/budget-items", json=new_item)
    assert add_res.status_code == 201
    created_item = add_res.json()
    item_id = created_item["id"]

    # Delete the line item
    del_res = client.delete(f"/api/events/{target_id}/budget-items/{item_id}")
    assert del_res.status_code == 204


def test_timeline_toggle():
    """Test toggling a milestone's completed status."""
    events = client.get("/api/events").json()
    target_event = events[0]
    target_id = target_event["id"]
    timeline_id = target_event["timeline_items"][0]["id"]
    initial_completed = target_event["timeline_items"][0]["completed"]

    toggle_res = client.patch(f"/api/events/{target_id}/timeline-items/{timeline_id}/toggle")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["completed"] != initial_completed


def test_guest_crud():
    """Test adding, updating RSVP, and deleting a guest."""
    events = client.get("/api/events").json()
    target_id = events[0]["id"]

    guest_payload = {
        "name": "Lady Genevieve",
        "party_size": 2,
        "rsvp_status": "pending",
        "dietary": "Vegetarian",
        "table_number": 5,
        "email_or_phone": "genevieve@example.com",
        "notes": "VIP guest",
    }
    add_res = client.post(f"/api/events/{target_id}/guests", json=guest_payload)
    assert add_res.status_code == 201
    guest_data = add_res.json()
    guest_id = guest_data["id"]
    assert guest_data["name"] == "Lady Genevieve"

    # Update RSVP
    rsvp_res = client.patch(f"/api/events/{target_id}/guests/{guest_id}/rsvp", json={"rsvp_status": "confirmed"})
    assert rsvp_res.status_code == 200
    assert rsvp_res.json()["rsvp_status"] == "confirmed"

    # Delete guest
    del_res = client.delete(f"/api/events/{target_id}/guests/{guest_id}")
    assert del_res.status_code == 204

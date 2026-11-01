"""
Security validation tests: security headers, rate limiting, XSS prevention.
"""

from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_security_headers_present():
    """Verify essential OWASP headers are present in responses."""
    response = client.get("/health")
    assert response.status_code == 200
    headers = response.headers

    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert "strict-origin-when-cross-origin" in headers.get("Referrer-Policy", "")
    assert "Content-Security-Policy" in headers


def test_xss_injection_sanitization_in_api():
    """Verify malicious payloads are escaped when creating events."""
    payload = {
        "title": "<script>alert('pwned')</script>Annual Gala",
        "event_type": "corporate",
        "guest_count": 50,
        "total_budget": 5000.0,
        "theme": "<img src=x onerror=alert(1)>",
        "generate_ai_plan": False,
    }
    response = client.post("/api/events", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "<script>" not in data["title"]
    assert "&lt;script&gt;" in data["title"]
    assert "<img" not in data["theme"]
    # Clean up
    client.delete(f"/api/events/{data['id']}")


def test_xss_sanitization_in_budget_and_vendors():
    """Verify XSS payloads in budget items, vendors, and guests are strictly sanitized."""
    ev = client.post(
        "/api/events",
        json={
            "title": "Security Audit Celebration",
            "event_type": "birthday",
            "guest_count": 25,
            "total_budget": 50000.0,
            "generate_ai_plan": False,
        },
    ).json()
    event_id = ev["id"]

    # Budget item injection test
    b_res = client.post(
        f"/api/events/{event_id}/budget-items",
        json={
            "name": "<script>alert('budget')</script>Catering",
            "category": "Catering",
            "estimated_cost": 25000.0,
            "notes": "<svg onload=alert(1)>Special notes",
        },
    )
    assert b_res.status_code == 201
    b_data = b_res.json()
    assert "<script>" not in b_data["name"]
    assert "&lt;script&gt;" in b_data["name"]
    assert "<svg" not in b_data["notes"]

    # Vendor item injection test
    v_res = client.post(
        f"/api/events/{event_id}/vendors",
        json={
            "name": "<a href='javascript:alert(1)'>Hacker Vendor</a>",
            "category": "Entertainment",
            "quoted_cost": 15000.0,
            "notes": "<iframe src='malicious.com'></iframe>",
        },
    )
    assert v_res.status_code == 201
    v_data = v_res.json()
    assert "<a href=" not in v_data["name"]
    assert "<iframe" not in v_data["notes"]

    # Clean up
    client.delete(f"/api/events/{event_id}")


def test_owasp_level3_security_headers():
    """Verify advanced OWASP Level 3 security headers and response tracking."""
    response = client.get("/health")
    assert response.status_code == 200
    headers = response.headers

    # OWASP Level 3 headers
    assert "max-age=63072000" in headers.get("Strict-Transport-Security", "")
    assert headers.get("Cross-Origin-Opener-Policy") == "same-origin"
    assert headers.get("Cross-Origin-Resource-Policy") == "same-origin"
    assert "geolocation=()" in headers.get("Permissions-Policy", "")

    # Tracing & Performance Metrics
    assert "X-Request-ID" in headers
    assert "X-Response-Time" in headers
    assert "ms" in headers.get("X-Response-Time", "")


def test_payload_size_limit_rejection():
    """Verify DoS mitigation rejects payloads larger than 2MB with 413."""
    oversized_headers = {
        "content-length": str(3 * 1024 * 1024),
        "content-type": "application/json",
    }
    response = client.post("/api/events", content=b"{}", headers=oversized_headers)
    assert response.status_code == 413
    data = response.json()
    assert data["error"] == "PAYLOAD_TOO_LARGE"
    assert "2 MB" in data["detail"]


def test_rate_limiting_headers_and_controls():
    """Verify RFC rate limit headers are present on API requests."""
    response = client.get("/api/events")
    assert response.status_code == 200
    headers = response.headers
    assert "X-RateLimit-Limit" in headers
    assert "X-RateLimit-Remaining" in headers
    assert "X-RateLimit-Reset" in headers


def test_http_caching_controls():
    """Verify static assets are aggressively cached while API endpoints remain fresh."""
    static_res = client.get("/static/css/styles.css")
    assert static_res.status_code == 200
    assert "public, max-age=" in static_res.headers.get("Cache-Control", "")

    api_res = client.get("/api/events")
    assert api_res.status_code == 200
    assert "no-cache, no-store" in api_res.headers.get("Cache-Control", "")


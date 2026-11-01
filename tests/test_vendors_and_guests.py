"""
Comprehensive unit and API tests for Vendor Management, Deliverable Task Toggling,
Guest RSVP Tracking, Seating Assignments, and Field Alias Normalization.
"""

from starlette.testclient import TestClient
from app.main import app
from app.models.event import VendorItem, VendorStatus, GuestItem, GuestRSVPStatus

client = TestClient(app)


def test_vendor_alias_mapping_and_normalization():
    """Verify that VendorItem accepts frontend aliases (contact_person, quoted_cost, checklist)."""
    raw_payload = {
        "category": "Floral Design",
        "name": "Botanical Atelier",
        "contact_person": "Camilla Rosales",
        "quoted_cost": 3200.0,
        "status": "quoted",  # snake_case string should normalize to Quote Received
        "checklist": ["Submit moodboard", "Order Ecuadorian roses", "Coordinate delivery"],
    }
    vendor = VendorItem(**raw_payload)
    assert vendor.contact_name == "Camilla Rosales"
    assert vendor.quoted_price == 3200.0
    assert vendor.status == VendorStatus.QUOTE_RECEIVED
    assert len(vendor.checklist_tasks) == 3


def test_vendor_api_add_and_toggle_task():
    """Verify adding a vendor and toggling deliverable tasks via API."""
    events = client.get("/api/events").json()
    event_id = events[0]["id"]

    vendor_payload = {
        "category": "Entertainment & DJ",
        "name": "Groove & Bass Audio",
        "contact_person": "DJ Marcus",
        "quoted_cost": 1800.0,
        "status": "contracted",
        "checklist": ["Confirm sound rig", "Collect entrance song", "Soundcheck at 4 PM"],
    }
    res = client.post(f"/api/events/{event_id}/vendors", json=vendor_payload)
    assert res.status_code == 201
    vendor = res.json()
    vendor_id = vendor["id"]
    assert vendor["status"] == "Contract Signed"
    assert len(vendor["checklist_tasks"]) == 3

    # Toggle task 1
    task_res = client.patch(
        f"/api/events/{event_id}/vendors/{vendor_id}/task",
        json={"task": "Confirm sound rig"},
    )
    assert task_res.status_code == 200
    updated_vendor = task_res.json()
    assert "Confirm sound rig" in updated_vendor["completed_tasks"]

    # Toggle again to untoggle
    task_res2 = client.patch(
        f"/api/events/{event_id}/vendors/{vendor_id}/task",
        json={"task": "Confirm sound rig"},
    )
    assert task_res2.status_code == 200
    assert "Confirm sound rig" not in task_res2.json()["completed_tasks"]

    # Clean up
    del_res = client.delete(f"/api/events/{event_id}/vendors/{vendor_id}")
    assert del_res.status_code == 204


def test_guest_alias_mapping_and_rsvp_normalization():
    """Verify GuestItem accepts full_name, table_assignment, dietary_notes, and attending status."""
    raw_guest = {
        "full_name": "Oliver & Charlotte King",
        "party_size": 2,
        "rsvp_status": "attending",  # should normalize to confirmed
        "dietary_notes": "Gluten-Free",
        "table_assignment": "Table 7",
        "email": "oliver.king@example.com",
    }
    guest = GuestItem(**raw_guest)
    assert guest.name == "Oliver & Charlotte King"
    assert guest.rsvp_status == GuestRSVPStatus.CONFIRMED
    assert guest.dietary == "Gluten-Free"
    assert guest.table_number == 7
    assert guest.email_or_phone == "oliver.king@example.com"


def test_guest_api_add_and_rsvp_patch():
    """Verify adding guest and updating RSVP via API."""
    events = client.get("/api/events").json()
    event_id = events[0]["id"]

    guest_payload = {
        "full_name": "Dr. Aris Thorne",
        "party_size": 1,
        "rsvp_status": "pending",
        "dietary_notes": "Vegan",
        "table_assignment": "Table 4",
    }
    res = client.post(f"/api/events/{event_id}/guests", json=guest_payload)
    assert res.status_code == 201
    guest_id = res.json()["id"]

    # Update to attending via API
    patch_res = client.patch(
        f"/api/events/{event_id}/guests/{guest_id}/rsvp",
        json={"rsvp_status": "attending"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["rsvp_status"] == "confirmed"

    # Delete
    del_res = client.delete(f"/api/events/{event_id}/guests/{guest_id}")
    assert del_res.status_code == 204


def test_inr_currency_and_seed_budgets():
    """Verify all pre-seeded reference celebrations use Indian Rupees (INR) and realistic scale."""
    events = client.get("/api/events").json()
    seed_events = [e for e in events if e["id"].startswith("seed-")]
    assert len(seed_events) >= 3
    for ev in seed_events:
        assert ev["currency"] == "INR"
        assert ev["total_budget"] >= 300000.0  # Indian Rupee celebration scale (₹3.5L+)


def test_vendor_and_budget_payment_synchronization():
    """Verify that marking a vendor Fully Paid synchronizes with Budget line items and vice versa."""
    # Create test event
    ev_res = client.post(
        "/api/events",
        json={
            "title": "Synchronization Test Gala",
            "event_type": "wedding",
            "total_budget": 1500000.0,
            "guest_count": 80,
            "currency": "INR",
            "generate_ai_plan": False,
        },
    )
    assert ev_res.status_code == 201
    event_id = ev_res.json()["id"]

    # Add a vendor
    v_res = client.post(
        f"/api/events/{event_id}/vendors",
        json={
            "name": "Royal Shahi Catering Co",
            "category": "Catering & Bar",
            "quoted_cost": 450000.0,
            "status": "Quote Received",
            "contact_person": "Chef Vikram",
        },
    )
    assert v_res.status_code == 201
    vendor_id = v_res.json()["id"]

    # Also add matching budget item
    b_res = client.post(
        f"/api/events/{event_id}/budget-items",
        json={
            "name": "Royal Shahi Catering Co Dinner",
            "category": "Catering & Bar",
            "estimated_cost": 450000.0,
            "actual_cost": 0.0,
            "paid": False,
        },
    )
    assert b_res.status_code == 201
    b_item_id = b_res.json()["id"]

    # 1. Update vendor status to "Fully Paid"
    status_res = client.patch(
        f"/api/events/{event_id}/vendors/{vendor_id}/status",
        json={"status": "Fully Paid"},
    )
    assert status_res.status_code == 200

    # Fetch event and verify budget item was automatically marked paid with actual_cost
    updated_ev = client.get(f"/api/events/{event_id}").json()
    b_matched = next(i for i in updated_ev["budget_items"] if i["id"] == b_item_id)
    assert b_matched["paid"] is True
    assert b_matched["actual_cost"] == 450000.0

    # 2. Toggle budget item to unpaid via toggle-paid endpoint
    toggle_res = client.patch(f"/api/events/{event_id}/budget-items/{b_item_id}/toggle-paid")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["paid"] is False

    # Verify vendor status is no longer Fully Paid
    updated_ev2 = client.get(f"/api/events/{event_id}").json()
    v_matched = next(v for v in updated_ev2["vendors"] if v["id"] == vendor_id)
    assert v_matched["status"] != "Fully Paid"

    # Clean up
    client.delete(f"/api/events/{event_id}")


def test_cost_variance_calculation_and_settlement_ledger():
    """Verify that budget item actual vs estimated costs produce accurate variance and settlement metrics."""
    ev_res = client.post(
        "/api/events",
        json={
            "title": "Variance Ledger Test Celebration",
            "event_type": "birthday",
            "total_budget": 500000.0,
            "guest_count": 50,
            "currency": "INR",
            "generate_ai_plan": False,
        },
    )
    assert ev_res.status_code == 201
    event_id = ev_res.json()["id"]

    # Add item under budget (Savings)
    res1 = client.post(
        f"/api/events/{event_id}/budget-items",
        json={
            "name": "Sound & Lighting Setup",
            "category": "Entertainment & Music",
            "estimated_cost": 50000.0,
            "actual_cost": 42000.0,
            "paid": True,
        },
    )
    assert res1.status_code == 201

    # Add item over budget (Overrun)
    res2 = client.post(
        f"/api/events/{event_id}/budget-items",
        json={
            "name": "Custom Cake & Dessert Bar",
            "category": "Catering & Bar",
            "estimated_cost": 30000.0,
            "actual_cost": 38000.0,
            "paid": False,
        },
    )
    assert res2.status_code == 201

    ev = client.get(f"/api/events/{event_id}").json()
    items = ev["budget_items"]
    assert len(items) == 2

    # Verify individual calculations
    item1 = next(i for i in items if i["name"] == "Sound & Lighting Setup")
    item2 = next(i for i in items if i["name"] == "Custom Cake & Dessert Bar")

    diff1 = item1["estimated_cost"] - item1["actual_cost"]  # +8000 (Savings)
    assert diff1 == 8000.0
    assert item1["paid"] is True

    diff2 = item2["estimated_cost"] - item2["actual_cost"]  # -8000 (Overrun)
    assert diff2 == -8000.0
    assert item2["paid"] is False

    # Clean up
    client.delete(f"/api/events/{event_id}")


def test_record_budget_item_payment_custom_actual_cost():
    """Verify record_budget_payment endpoint accurately records custom actual spending and computes profit/savings."""
    ev_res = client.post(
        "/api/events",
        json={
            "title": "Payment Settlement Test",
            "event_type": "wedding",
            "total_budget": 1000000.0,
            "guest_count": 150,
            "currency": "INR",
            "generate_ai_plan": False,
        },
    )
    assert ev_res.status_code == 201
    event_id = ev_res.json()["id"]

    # Add a budget item
    b_res = client.post(
        f"/api/events/{event_id}/budget-items",
        json={
            "name": "Floral Mandap & Arch",
            "category": "Decorations & Florals",
            "estimated_cost": 100000.0,
            "actual_cost": 0.0,
            "paid": False,
        },
    )
    assert b_res.status_code == 201
    item_id = b_res.json()["id"]

    # Record actual payment with negotiated savings (₹88,000 actual spent vs ₹100,000 estimate)
    pay_res = client.post(
        f"/api/events/{event_id}/budget-items/{item_id}/record-payment",
        json={
            "actual_cost": 88000.0,
            "paid": True,
            "notes": "UPI Ref #44923 - 12% discount secured",
        },
    )
    assert pay_res.status_code == 200
    updated_item = pay_res.json()
    assert updated_item["paid"] is True
    assert updated_item["actual_cost"] == 88000.0
    assert "UPI Ref" in updated_item["notes"]

    # Verify Budget Summary reflects the ₹12,000 profit/savings
    sum_res = client.get(f"/api/events/{event_id}/budget-summary")
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["net_variance"] == 12000.0
    assert summary["profit_or_loss"] == 12000.0
    assert summary["profit_or_loss_status"] == "profit_savings"
    assert summary["total_paid"] == 88000.0
    assert summary["unpaid_balance"] == 0.0

    # Clean up
    client.delete(f"/api/events/{event_id}")


def test_settle_vendor_payment_with_custom_actual_paid():
    """Verify settle_vendor_payment sets custom paid amount and syncs with matching budget items."""
    ev_res = client.post(
        "/api/events",
        json={
            "title": "Vendor Settlement Test",
            "event_type": "community",
            "total_budget": 500000.0,
            "guest_count": 200,
            "currency": "INR",
            "generate_ai_plan": False,
        },
    )
    assert ev_res.status_code == 201
    event_id = ev_res.json()["id"]

    # Register vendor
    v_res = client.post(
        f"/api/events/{event_id}/vendors",
        json={
            "name": "Community Sound Engineers",
            "category": "Audio & Visual",
            "quoted_cost": 50000.0,
            "status": "Contract Signed",
        },
    )
    assert v_res.status_code == 201
    vendor_id = v_res.json()["id"]

    # Add matching budget line item
    b_res = client.post(
        f"/api/events/{event_id}/budget-items",
        json={
            "name": "Community Sound Engineers",
            "category": "Audio & Visual",
            "estimated_cost": 50000.0,
            "actual_cost": 0.0,
            "paid": False,
        },
    )
    assert b_res.status_code == 201
    budget_id = b_res.json()["id"]

    # Settle vendor with custom negotiated settlement (₹45,000 paid vs ₹50,000 quote)
    settle_res = client.post(
        f"/api/events/{event_id}/vendors/{vendor_id}/settle",
        json={
            "actual_paid": 45000.0,
            "notes": "NetBanking Cheque #99102 settled in full",
        },
    )
    assert settle_res.status_code == 200
    vendor_data = settle_res.json()
    assert vendor_data["status"] == "Fully Paid"
    assert vendor_data["actual_paid"] == 45000.0

    # Verify corresponding budget item was updated with actual_cost 45000.0 and paid=True
    ev_updated = client.get(f"/api/events/{event_id}").json()
    b_matched = next(i for i in ev_updated["budget_items"] if i["id"] == budget_id)
    assert b_matched["paid"] is True
    assert b_matched["actual_cost"] == 45000.0

    # Verify summary reports net savings of ₹5,000
    sum_res = client.get(f"/api/events/{event_id}/budget-summary")
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["net_variance"] == 5000.0
    assert summary["profit_or_loss_status"] == "profit_savings"

    # Clean up
    client.delete(f"/api/events/{event_id}")


def test_budget_summary_deficit_overrun():
    """Verify that actual expenses exceeding estimates trigger deficit / loss_overrun status."""
    ev_res = client.post(
        "/api/events",
        json={
            "title": "Deficit Testing Event",
            "event_type": "birthday",
            "total_budget": 200000.0,
            "guest_count": 30,
            "currency": "INR",
            "generate_ai_plan": False,
        },
    )
    assert ev_res.status_code == 201
    event_id = ev_res.json()["id"]

    # Add item that overruns estimate (e.g. unexpected guest additions)
    b_res = client.post(
        f"/api/events/{event_id}/budget-items",
        json={
            "name": "Live Band Overtime",
            "category": "Entertainment & Music",
            "estimated_cost": 25000.0,
            "actual_cost": 35000.0,
            "paid": True,
        },
    )
    assert b_res.status_code == 201

    sum_res = client.get(f"/api/events/{event_id}/budget-summary")
    assert sum_res.status_code == 200
    summary = sum_res.json()
    # Net variance = Estimated - Actual = 25000 - 35000 = -10000.0
    assert summary["net_variance"] == -10000.0
    assert summary["profit_or_loss"] == -10000.0
    assert summary["profit_or_loss_status"] == "loss_overrun"

    # Clean up
    client.delete(f"/api/events/{event_id}")



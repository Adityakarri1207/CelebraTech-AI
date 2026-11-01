"""
Unit tests for data models, validation constraints, and sanitization.
"""

import pytest
from pydantic import ValidationError
from app.models.event import (
    EventType,
    BudgetItem,
    TimelineItem,
    TimelinePhase,
    VendorItem,
    VendorStatus,
    PersonalizedIdeaItem,
    GuestItem,
    GuestRSVPStatus,
    ColorSwatch,
    EventPlan,
    sanitize_text,
)


def test_sanitize_text_prevents_xss():
    """Ensure HTML tags are sanitized."""
    malicious = "<script>alert('xss')</script>Celebration"
    cleaned = sanitize_text(malicious)
    assert "<script>" not in cleaned
    assert "&lt;script&gt;" in cleaned


def test_budget_item_validation():
    """Ensure positive costs and proper sanitization."""
    item = BudgetItem(
        name="<b>Gourmet Cake</b>",
        estimated_cost=450.0,
        actual_cost=400.0,
        paid=True,
    )
    assert item.name == "&lt;b&gt;Gourmet Cake&lt;/b&gt;"
    assert item.estimated_cost == 450.0
    assert item.actual_cost == 400.0
    assert item.paid is True

    # Negative costs should fail validation
    with pytest.raises(ValidationError):
        BudgetItem(name="Invalid Cost", estimated_cost=-10.0)


def test_timeline_item_validation():
    """Ensure timeline item constraints."""
    item = TimelineItem(
        title="First Dance",
        time_or_offset="06:00 PM",
        phase=TimelinePhase.DAY_OF,
        owner="Bride & Groom",
        completed=False,
    )
    assert item.phase == TimelinePhase.DAY_OF
    assert item.completed is False


def test_vendor_item_validation():
    """Ensure vendor status and checklist defaults."""
    vendor = VendorItem(
        category="Photography",
        name="Lumiere Studio",
        quoted_price=2500.0,
        checklist_tasks=["Review portfolio", "Sign contract"],
    )
    assert vendor.status == VendorStatus.RESEARCHING
    assert len(vendor.checklist_tasks) == 2
    assert vendor.completed_tasks == []


def test_guest_item_validation():
    """Ensure guest RSVP status and sanitization."""
    guest = GuestItem(
        name="<b>Uncle Bob</b>",
        party_size=2,
        rsvp_status=GuestRSVPStatus.CONFIRMED,
        dietary="Vegan",
        table_number=4,
    )
    assert guest.name == "&lt;b&gt;Uncle Bob&lt;/b&gt;"
    assert guest.party_size == 2
    assert guest.rsvp_status == GuestRSVPStatus.CONFIRMED
    assert guest.table_number == 4


def test_color_swatch_validation():
    """Ensure hex code validation for color swatches."""
    swatch = ColorSwatch(name="Terracotta", hex_code="#E07A5F", role="Primary")
    assert swatch.name == "Terracotta"
    assert swatch.hex_code == "#E07A5F"


def test_event_plan_structure():
    """Verify EventPlan defaults and structure."""
    event = EventPlan(
        title="Golden Jubilee",
        event_type=EventType.BIRTHDAY,
        total_budget=5000.0,
        guest_count=60,
    )
    assert event.event_type == EventType.BIRTHDAY
    assert event.guest_count == 60
    assert event.total_budget == 5000.0
    assert isinstance(event.id, str)
    assert len(event.id) > 0

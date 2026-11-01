"""
Unit tests for BudgetService: allocations, calculations, over-budget alerts.
"""

from app.models.event import EventPlan, EventType, BudgetItem
from app.services.budget_service import BudgetService


def test_starter_budget_generation():
    """Ensure starter budget aligns with event type."""
    wedding_budget = BudgetService.generate_starter_budget(
        total_budget=10000.0,
        event_type=EventType.WEDDING,
        guest_count=100,
    )
    assert len(wedding_budget) > 0
    total_est = sum(i.estimated_cost for i in wedding_budget)
    # Sum of items should match total budget closely
    assert round(total_est, -1) == 10000.0


def test_budget_summary_healthy():
    """Test calculations under budget."""
    event = EventPlan(
        title="Spring Birthday",
        event_type=EventType.BIRTHDAY,
        total_budget=5000.0,
        budget_items=[
            BudgetItem(category="Catering & Bar", name="Buffet", estimated_cost=2000.0, actual_cost=1800.0, paid=True),
            BudgetItem(category="Venue & Rentals", name="Hall", estimated_cost=1500.0, actual_cost=1500.0, paid=True),
        ],
    )
    summary = BudgetService.calculate_summary(event)
    assert summary.total_budget == 5000.0
    assert summary.total_actual == 3300.0
    assert summary.remaining_budget == 1700.0
    assert summary.is_over_budget is False
    assert summary.over_budget_amount == 0.0
    assert summary.percentage_spent == 66.0
    assert len(summary.cost_saving_recommendations) > 0


def test_budget_summary_over_budget():
    """Test over-budget detection and warnings."""
    event = EventPlan(
        title="Gala",
        event_type=EventType.COMMUNITY,
        total_budget=3000.0,
        budget_items=[
            BudgetItem(category="Catering & Bar", name="Meals", estimated_cost=2500.0, actual_cost=2700.0, paid=True),
            BudgetItem(category="Venue & Rentals", name="Park", estimated_cost=1000.0, actual_cost=1200.0, paid=True),
        ],
    )
    summary = BudgetService.calculate_summary(event)
    assert summary.total_actual == 3900.0
    assert summary.is_over_budget is True
    assert summary.over_budget_amount == 900.0
    assert summary.remaining_budget == -900.0
    assert any("Alert" in rec for rec in summary.cost_saving_recommendations)

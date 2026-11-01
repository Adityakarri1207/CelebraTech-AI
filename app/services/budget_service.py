"""
Budget service for CelebraTech AI Event Planner.
Provides financial analytics, category allocations, variance analysis,
over-budget alerts, and smart cost-saving recommendations.
"""

from typing import List, Dict
from app.models.event import (
    BudgetItem,
    BudgetSummary,
    BudgetCategory,
    EventType,
    EventPlan,
)


class BudgetService:
    """Handles financial tracking, auto-allocation, and variance recommendations."""

    # Standard industry budget allocation percentages by event type
    STANDARD_ALLOCATIONS: Dict[EventType, Dict[str, float]] = {
        EventType.WEDDING: {
            BudgetCategory.VENUE.value: 0.35,
            BudgetCategory.CATERING.value: 0.30,
            BudgetCategory.PHOTOGRAPHY.value: 0.12,
            BudgetCategory.DECOR.value: 0.08,
            BudgetCategory.ENTERTAINMENT.value: 0.07,
            BudgetCategory.ATTIRE.value: 0.04,
            BudgetCategory.FAVORS.value: 0.02,
            BudgetCategory.MISCELLANEOUS.value: 0.02,
        },
        EventType.BIRTHDAY: {
            BudgetCategory.VENUE.value: 0.25,
            BudgetCategory.CATERING.value: 0.35,
            BudgetCategory.ENTERTAINMENT.value: 0.15,
            BudgetCategory.DECOR.value: 0.10,
            BudgetCategory.PHOTOGRAPHY.value: 0.05,
            BudgetCategory.FAVORS.value: 0.05,
            BudgetCategory.MISCELLANEOUS.value: 0.05,
        },
        EventType.COMMUNITY: {
            BudgetCategory.VENUE.value: 0.20,
            BudgetCategory.ENTERTAINMENT.value: 0.25,  # Sound, staging, permits
            BudgetCategory.CATERING.value: 0.20,
            BudgetCategory.DECOR.value: 0.10,  # Signage, banners
            BudgetCategory.MISCELLANEOUS.value: 0.15,  # Sanitation, security, safety
            BudgetCategory.FAVORS.value: 0.05,  # Badges, wristbands
            BudgetCategory.PHOTOGRAPHY.value: 0.05,
        },
        EventType.ANNIVERSARY: {
            BudgetCategory.VENUE.value: 0.30,
            BudgetCategory.CATERING.value: 0.35,
            BudgetCategory.PHOTOGRAPHY.value: 0.15,
            BudgetCategory.ENTERTAINMENT.value: 0.10,
            BudgetCategory.DECOR.value: 0.05,
            BudgetCategory.MISCELLANEOUS.value: 0.05,
        },
        EventType.CORPORATE: {
            BudgetCategory.VENUE.value: 0.35,
            BudgetCategory.CATERING.value: 0.30,
            BudgetCategory.ENTERTAINMENT.value: 0.15,  # AV, speakers
            BudgetCategory.DECOR.value: 0.05,
            BudgetCategory.PHOTOGRAPHY.value: 0.05,
            BudgetCategory.FAVORS.value: 0.05,
            BudgetCategory.MISCELLANEOUS.value: 0.05,
        },
        EventType.OTHER: {
            BudgetCategory.VENUE.value: 0.30,
            BudgetCategory.CATERING.value: 0.30,
            BudgetCategory.ENTERTAINMENT.value: 0.15,
            BudgetCategory.DECOR.value: 0.10,
            BudgetCategory.PHOTOGRAPHY.value: 0.05,
            BudgetCategory.MISCELLANEOUS.value: 0.10,
        },
    }

    @classmethod
    def calculate_summary(cls, event: EventPlan) -> BudgetSummary:
        """
        Calculates comprehensive financial summary, percentage spent,
        category breakdowns, and active savings recommendations.
        """
        total_budget = round(float(event.total_budget), 2)
        total_estimated = round(sum(item.estimated_cost for item in event.budget_items), 2)
        total_actual = round(sum(item.actual_cost for item in event.budget_items), 2)

        # Baseline expenditure tracking
        effective_expense = total_actual if total_actual > 0 else total_estimated
        remaining_budget = round(total_budget - effective_expense, 2)
        is_over_budget = effective_expense > total_budget
        over_budget_amount = round(max(0.0, effective_expense - total_budget), 2)

        percentage_spent = (
            round((effective_expense / total_budget) * 100, 1)
            if total_budget > 0
            else 0.0
        )

        # Build category breakdown
        category_breakdown: Dict[str, Dict[str, float]] = {}
        for item in event.budget_items:
            cat = item.category
            if cat not in category_breakdown:
                category_breakdown[cat] = {
                    "estimated": 0.0,
                    "actual": 0.0,
                    "count": 0,
                    "percentage_of_total": 0.0,
                }
            category_breakdown[cat]["estimated"] += item.estimated_cost
            category_breakdown[cat]["actual"] += item.actual_cost
            category_breakdown[cat]["count"] += 1

        for cat, data in category_breakdown.items():
            data["estimated"] = round(data["estimated"], 2)
            data["actual"] = round(data["actual"], 2)
            cat_expense = data["actual"] if data["actual"] > 0 else data["estimated"]
            data["percentage_of_total"] = (
                round((cat_expense / total_budget) * 100, 1)
                if total_budget > 0
                else 0.0
            )

        # Calculate variance and profit/loss metrics
        net_variance = round(total_estimated - total_actual, 2)
        total_paid = round(
            sum(
                (item.actual_cost if item.actual_cost > 0 else item.estimated_cost)
                for item in event.budget_items
                if item.paid
            ),
            2,
        )
        unpaid_balance = round(max(0.0, effective_expense - total_paid), 2)
        profit_or_loss = net_variance
        if total_actual == 0:
            profit_or_loss_status = "pending_actuals"
        elif profit_or_loss > 0:
            profit_or_loss_status = "profit_savings"
        elif profit_or_loss < 0:
            profit_or_loss_status = "loss_overrun"
        else:
            profit_or_loss_status = "balanced"

        # Generate intelligent recommendations
        recommendations = cls._generate_recommendations(
            event_type=event.event_type,
            total_budget=total_budget,
            effective_expense=effective_expense,
            remaining_budget=remaining_budget,
            category_breakdown=category_breakdown,
        )

        return BudgetSummary(
            total_budget=total_budget,
            total_estimated=total_estimated,
            total_actual=total_actual,
            remaining_budget=remaining_budget,
            is_over_budget=is_over_budget,
            over_budget_amount=over_budget_amount,
            percentage_spent=percentage_spent,
            category_breakdown=category_breakdown,
            cost_saving_recommendations=recommendations,
            net_variance=net_variance,
            total_paid=total_paid,
            unpaid_balance=unpaid_balance,
            profit_or_loss=profit_or_loss,
            profit_or_loss_status=profit_or_loss_status,
        )

    @classmethod
    def _generate_recommendations(
        cls,
        event_type: EventType,
        total_budget: float,
        effective_expense: float,
        remaining_budget: float,
        category_breakdown: Dict[str, Dict[str, float]],
    ) -> List[str]:
        """Produce actionable AI financial tips based on category ratios."""
        recs: List[str] = []

        if effective_expense > total_budget:
            variance = effective_expense - total_budget
            recs.append(
                f"Alert: Currently exceeding target budget by ₹{variance:,.2f}. Consider trimming optional favors or switching to seasonal menu items."
            )
        elif remaining_budget > (total_budget * 0.15):
            recs.append(
                f"Great financial buffer! You have ₹{remaining_budget:,.2f} ({(remaining_budget/total_budget)*100:.1f}%) in reserve for surprise upgrades or guest favors."
            )

        # Catering check
        catering_data = category_breakdown.get(BudgetCategory.CATERING.value)
        if catering_data and total_budget > 0:
            catering_pct = catering_data["percentage_of_total"]
            if catering_pct > 38.0:
                recs.append(
                    "Catering exceeds 38% of your budget: Switching from a plated dinner to elevated family-style or buffet can save up to 15-20%."
                )

        # Decor check
        decor_data = category_breakdown.get(BudgetCategory.DECOR.value)
        if decor_data and total_budget > 0:
            if decor_data["percentage_of_total"] > 14.0:
                recs.append(
                    "Decor exceeds 14%: Repurpose ceremony floral arrangements into reception centerpieces to trim floral costs by ~30%."
                )

        # Event-specific recommendations
        if event_type == EventType.WEDDING:
            recs.append(
                "Wedding Tip: Standard vendor gratuities are 15-20%; ensure a 5% contingency fund is maintained for day-of emergency cash needs."
            )
        elif event_type == EventType.BIRTHDAY:
            recs.append(
                "Birthday Tip: Digital interactive invitations save printing and postage costs, while automated RSVP tracking reduces food waste."
            )
        elif event_type == EventType.COMMUNITY:
            recs.append(
                "Community Event Tip: Explore local corporate co-sponsorships or food truck partnerships to offset venue and catering expenses."
            )

        if not recs:
            recs.append("Your budget distribution is well-balanced across all categories. Keep monitoring actual invoices as quotes arrive.")

        return recs

    @classmethod
    def generate_starter_budget(
        cls,
        total_budget: float,
        event_type: EventType,
        guest_count: int = 50,
    ) -> List[BudgetItem]:
        """
        Creates realistic, itemized budget line items distributed
        according to the event type's proven industry percentages.
        """
        allocations = cls.STANDARD_ALLOCATIONS.get(
            event_type, cls.STANDARD_ALLOCATIONS[EventType.OTHER]
        )
        items: List[BudgetItem] = []

        # Granular item generator tailored to event type
        if event_type == EventType.WEDDING:
            cat_alloc = {
                (BudgetCategory.VENUE.value, "Main Ceremony & Reception Venue Rental"): 0.28,
                (BudgetCategory.VENUE.value, "Tables, Chairs & Linens Rental"): 0.07,
                (BudgetCategory.CATERING.value, f"Plated/Buffet Dinner for {guest_count} Guests"): 0.22,
                (BudgetCategory.CATERING.value, "Open Bar & Signature Cocktails"): 0.08,
                (BudgetCategory.PHOTOGRAPHY.value, "Full Day Photography & Digital Gallery"): 0.08,
                (BudgetCategory.PHOTOGRAPHY.value, "Cinematic Drone & Highlight Video"): 0.04,
                (BudgetCategory.DECOR.value, "Floral Arches & Bridal Party Bouquets"): 0.05,
                (BudgetCategory.DECOR.value, "Atmospheric Uplighting & Candle Centerpieces"): 0.03,
                (BudgetCategory.ENTERTAINMENT.value, "Live Acoustic Ceremony Duo & Reception DJ"): 0.07,
                (BudgetCategory.ATTIRE.value, "Wedding Attire, Alterations & Styling"): 0.04,
                (BudgetCategory.FAVORS.value, "Custom Keepsake Favors & Welcome Boxes"): 0.02,
                (BudgetCategory.MISCELLANEOUS.value, "Marriage License, Gratuities & Contingency"): 0.02,
            }
        elif event_type == EventType.BIRTHDAY:
            cat_alloc = {
                (BudgetCategory.VENUE.value, "Event Lounge / Hall Space Rental"): 0.25,
                (BudgetCategory.CATERING.value, f"Appetizers, Buffet & Refreshments for {guest_count}"): 0.25,
                (BudgetCategory.CATERING.value, "Custom Artisan Celebration Cake & Dessert Bar"): 0.10,
                (BudgetCategory.ENTERTAINMENT.value, "Party DJ, Sound Rig & Interactive Host"): 0.15,
                (BudgetCategory.DECOR.value, "Custom Balloon Garland & Photo Backdrop"): 0.10,
                (BudgetCategory.PHOTOGRAPHY.value, "Event Photographer (3 Hours Coverage)"): 0.05,
                (BudgetCategory.FAVORS.value, "Personalized Party Favors & Swag Bags"): 0.05,
                (BudgetCategory.MISCELLANEOUS.value, "Party Games, Prizes & Surprise Elements"): 0.05,
            }
        elif event_type == EventType.COMMUNITY:
            cat_alloc = {
                (BudgetCategory.VENUE.value, "Park / Community Pavilion Permit & Rental"): 0.20,
                (BudgetCategory.ENTERTAINMENT.value, "Main Stage Sound System, Microphones & AV"): 0.15,
                (BudgetCategory.ENTERTAINMENT.value, "Live Performers, Kids Activities & Games"): 0.10,
                (BudgetCategory.CATERING.value, "Volunteer Meals, Water Stations & Snacks"): 0.20,
                (BudgetCategory.DECOR.value, "Directional Signage, Banners & Welcome Arch"): 0.10,
                (BudgetCategory.MISCELLANEOUS.value, "Portable Restrooms, Sanitation & First Aid"): 0.10,
                (BudgetCategory.PHOTOGRAPHY.value, "Community Coverage & Media Documentation"): 0.05,
                (BudgetCategory.FAVORS.value, "Attendee Wristbands, Badges & Event Maps"): 0.05,
                (BudgetCategory.MISCELLANEOUS.value, "Emergency Contingency & Cleanup Supplies"): 0.05,
            }
        else:
            cat_alloc = {
                (BudgetCategory.VENUE.value, "Venue Space Rental & Setup"): 0.30,
                (BudgetCategory.CATERING.value, "Catering, Food & Beverage"): 0.30,
                (BudgetCategory.ENTERTAINMENT.value, "Audio/Visual & Entertainment"): 0.15,
                (BudgetCategory.DECOR.value, "Ambiance, Decor & Signage"): 0.10,
                (BudgetCategory.PHOTOGRAPHY.value, "Photography & Highlights"): 0.05,
                (BudgetCategory.MISCELLANEOUS.value, "Contingency & Operating Supplies"): 0.10,
            }

        for (category, name), fraction in cat_alloc.items():
            est_cost = round(total_budget * fraction, 2)
            items.append(
                BudgetItem(
                    category=category,
                    name=name,
                    estimated_cost=est_cost,
                    actual_cost=0.0,
                    paid=False,
                    notes=f"Allocated {fraction*100:.1f}% based on target budget",
                )
            )

        return items

"""
REST API endpoints for Celebration and Event Management.
Provides CRUD, nested item operations, guest tracking, and data exports.
"""

from typing import List, Optional, Any
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field, field_validator

from app.models.event import (
    EventPlan,
    EventCreateRequest,
    EventUpdateRequest,
    BudgetItem,
    BudgetSummary,
    TimelineItem,
    VendorItem,
    VendorStatus,
    PersonalizedIdeaItem,
    GuestItem,
    GuestRSVPStatus,
)
from app.services.event_service import event_service
from app.services.budget_service import BudgetService
from app.services.export_service import ExportService

router = APIRouter(prefix="/api/events", tags=["Events"])


class StatusUpdatePayload(BaseModel):
    """Payload to update vendor progress status."""
    status: VendorStatus

    @field_validator("status", mode="before")
    @classmethod
    def normalize_vendor_status(cls, v: Any) -> Any:
        if isinstance(v, str):
            mapping = {
                "researching": VendorStatus.RESEARCHING,
                "contacted": VendorStatus.CONTACTED,
                "quoted": VendorStatus.QUOTE_RECEIVED,
                "quote received": VendorStatus.QUOTE_RECEIVED,
                "quote_received": VendorStatus.QUOTE_RECEIVED,
                "contracted": VendorStatus.CONTRACT_SIGNED,
                "contract signed": VendorStatus.CONTRACT_SIGNED,
                "contract_signed": VendorStatus.CONTRACT_SIGNED,
                "deposit paid": VendorStatus.DEPOSIT_PAID,
                "deposit_paid": VendorStatus.DEPOSIT_PAID,
                "fully paid": VendorStatus.FULLY_PAID,
                "fully_paid": VendorStatus.FULLY_PAID,
            }
            normalized = mapping.get(v.lower().strip())
            if normalized:
                return normalized
        return v


class TaskTogglePayload(BaseModel):
    """Payload to toggle vendor checklist task."""
    task: str = Field(..., min_length=1)


class PaymentRecordPayload(BaseModel):
    """Payload to record exact actual payment spent on a budget line item."""
    actual_cost: float = Field(..., ge=0.0)
    paid: bool = Field(default=True)
    notes: Optional[str] = Field(default=None, max_length=500)


class VendorSettlePayload(BaseModel):
    """Payload to settle vendor contract with final agreed actual payment."""
    actual_paid: float = Field(..., ge=0.0)
    notes: Optional[str] = Field(default=None, max_length=500)


class GuestRSVPPayload(BaseModel):
    """Payload to update guest RSVP status."""
    rsvp_status: GuestRSVPStatus

    @field_validator("rsvp_status", mode="before")
    @classmethod
    def normalize_guest_rsvp(cls, v: Any) -> Any:
        if isinstance(v, str):
            mapping = {
                "attending": GuestRSVPStatus.CONFIRMED,
                "confirmed": GuestRSVPStatus.CONFIRMED,
                "declined": GuestRSVPStatus.DECLINED,
                "pending": GuestRSVPStatus.PENDING,
                "invited": GuestRSVPStatus.PENDING,
            }
            normalized = mapping.get(v.lower().strip())
            if normalized:
                return normalized
        return v


@router.get("", response_model=List[EventPlan])
async def list_events() -> List[EventPlan]:
    """Retrieve all planned celebrations."""
    return event_service.list_events()


@router.post("", response_model=EventPlan, status_code=status.HTTP_201_CREATED)
async def create_event(req: EventCreateRequest) -> EventPlan:
    """Create a new event plan, with optional GenAI generation."""
    return event_service.create_event(req)


@router.get("/{event_id}", response_model=EventPlan)
async def get_event(event_id: str) -> EventPlan:
    """Retrieve details for a specific event."""
    event = event_service.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event plan not found.")
    return event


@router.put("/{event_id}", response_model=EventPlan)
async def update_event(event_id: str, req: EventUpdateRequest) -> EventPlan:
    """Update event metadata (title, date, location, budget, theme)."""
    updated = event_service.update_event(event_id, req)
    if not updated:
        raise HTTPException(status_code=404, detail="Event plan not found.")
    return updated


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: str) -> None:
    """Delete an event by ID."""
    deleted = event_service.delete_event(event_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Event plan not found.")


@router.get("/{event_id}/budget-summary", response_model=BudgetSummary)
async def get_budget_summary(event_id: str) -> BudgetSummary:
    """Compute real-time financial health, percentage spent, and variance."""
    event = event_service.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event plan not found.")
    return BudgetService.calculate_summary(event)


# Budget Items
@router.post("/{event_id}/budget-items", response_model=BudgetItem, status_code=status.HTTP_201_CREATED)
async def add_budget_item(event_id: str, item: BudgetItem) -> BudgetItem:
    """Add a new line item to the event budget."""
    created = event_service.add_budget_item(event_id, item)
    if not created:
        raise HTTPException(status_code=404, detail="Event plan not found.")
    return created


@router.put("/{event_id}/budget-items/{item_id}", response_model=BudgetItem)
async def update_budget_item(event_id: str, item_id: str, item: BudgetItem) -> BudgetItem:
    """Update an existing budget item."""
    updated = event_service.update_budget_item(event_id, item_id, item)
    if not updated:
        raise HTTPException(status_code=404, detail="Budget item or event not found.")
    return updated


@router.post("/{event_id}/budget-items/{item_id}/record-payment", response_model=BudgetItem)
async def record_budget_item_payment(event_id: str, item_id: str, payload: PaymentRecordPayload) -> BudgetItem:
    """Record an exact actual payment amount and update paid status and variance."""
    updated = event_service.record_budget_payment(
        event_id=event_id,
        item_id=item_id,
        actual_cost=payload.actual_cost,
        paid=payload.paid,
        notes=payload.notes,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Budget item or event not found.")
    return updated


@router.patch("/{event_id}/budget-items/{item_id}/toggle-paid", response_model=BudgetItem)
async def toggle_budget_item_paid(
    event_id: str,
    item_id: str,
    payload: Optional[PaymentRecordPayload] = None,
) -> BudgetItem:
    """Toggle paid status for a budget line item and synchronize with vendor ledger."""
    actual_cost = payload.actual_cost if payload else None
    notes = payload.notes if payload else None
    updated = event_service.toggle_budget_item_paid(
        event_id=event_id,
        item_id=item_id,
        actual_cost=actual_cost,
        notes=notes,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Budget item or event not found.")
    return updated


@router.delete("/{event_id}/budget-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget_item(event_id: str, item_id: str) -> None:
    """Remove a budget line item."""
    deleted = event_service.delete_budget_item(event_id, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Budget item or event not found.")


# Timeline Items
@router.post("/{event_id}/timeline-items", response_model=TimelineItem, status_code=status.HTTP_201_CREATED)
async def add_timeline_item(event_id: str, item: TimelineItem) -> TimelineItem:
    """Add a new milestone or run-of-show schedule entry."""
    created = event_service.add_timeline_item(event_id, item)
    if not created:
        raise HTTPException(status_code=404, detail="Event plan not found.")
    return created


@router.patch("/{event_id}/timeline-items/{item_id}/toggle", response_model=TimelineItem)
async def toggle_timeline_item(event_id: str, item_id: str) -> TimelineItem:
    """Toggle completed status of a timeline milestone."""
    updated = event_service.toggle_timeline_item(event_id, item_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Timeline item or event not found.")
    return updated


@router.delete("/{event_id}/timeline-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_timeline_item(event_id: str, item_id: str) -> None:
    """Delete a timeline milestone."""
    deleted = event_service.delete_timeline_item(event_id, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Timeline item or event not found.")


# Vendor Items
@router.post("/{event_id}/vendors", response_model=VendorItem, status_code=status.HTTP_201_CREATED)
async def add_vendor(event_id: str, vendor: VendorItem) -> VendorItem:
    """Add a new vendor to the directory."""
    created = event_service.add_vendor(event_id, vendor)
    if not created:
        raise HTTPException(status_code=404, detail="Event plan not found.")
    return created


@router.patch("/{event_id}/vendors/{vendor_id}/status", response_model=VendorItem)
async def update_vendor_status(event_id: str, vendor_id: str, payload: StatusUpdatePayload) -> VendorItem:
    """Update progress status of a vendor."""
    updated = event_service.update_vendor_status(event_id, vendor_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Vendor or event not found.")
    return updated


@router.post("/{event_id}/vendors/{vendor_id}/settle", response_model=VendorItem)
async def settle_vendor_payment(event_id: str, vendor_id: str, payload: VendorSettlePayload) -> VendorItem:
    """Settle vendor payment with exact actual paid amount and sync with budget ledger."""
    updated = event_service.settle_vendor_payment(
        event_id=event_id,
        vendor_id=vendor_id,
        actual_paid=payload.actual_paid,
        notes=payload.notes,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Vendor or event not found.")
    return updated


@router.patch("/{event_id}/vendors/{vendor_id}/task", response_model=VendorItem)
async def toggle_vendor_task(event_id: str, vendor_id: str, payload: TaskTogglePayload) -> VendorItem:
    """Toggle completion of an individual vendor checklist task."""
    updated = event_service.toggle_vendor_task(event_id, vendor_id, payload.task)
    if not updated:
        raise HTTPException(status_code=404, detail="Vendor or event not found.")
    return updated


@router.delete("/{event_id}/vendors/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor(event_id: str, vendor_id: str) -> None:
    """Delete a vendor from directory."""
    deleted = event_service.delete_vendor(event_id, vendor_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Vendor or event not found.")


# Guest Items
@router.post("/{event_id}/guests", response_model=GuestItem, status_code=status.HTTP_201_CREATED)
async def add_guest(event_id: str, guest: GuestItem) -> GuestItem:
    """Add a guest to the event invitation and RSVP roster."""
    created = event_service.add_guest(event_id, guest)
    if not created:
        raise HTTPException(status_code=404, detail="Event plan not found.")
    return created


@router.patch("/{event_id}/guests/{guest_id}/rsvp", response_model=GuestItem)
async def update_guest_rsvp(event_id: str, guest_id: str, payload: GuestRSVPPayload) -> GuestItem:
    """Update guest RSVP status (confirmed, declined, pending)."""
    updated = event_service.update_guest_rsvp(event_id, guest_id, payload.rsvp_status)
    if not updated:
        raise HTTPException(status_code=404, detail="Guest or event not found.")
    return updated


@router.delete("/{event_id}/guests/{guest_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_guest(event_id: str, guest_id: str) -> None:
    """Remove a guest from the list."""
    deleted = event_service.delete_guest(event_id, guest_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Guest or event not found.")


# Ideas
@router.post("/{event_id}/ideas", response_model=PersonalizedIdeaItem, status_code=status.HTTP_201_CREATED)
async def add_idea(event_id: str, idea: PersonalizedIdeaItem) -> PersonalizedIdeaItem:
    """Attach a personalized 3D idea card to the event."""
    created = event_service.add_idea(event_id, idea)
    if not created:
        raise HTTPException(status_code=404, detail="Event plan not found.")
    return created


# Exports
@router.get("/{event_id}/export/markdown")
async def export_markdown(event_id: str) -> PlainTextResponse:
    """Download clean Markdown report for printing or sharing."""
    event = event_service.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event plan not found.")
    md_content = ExportService.generate_markdown_report(event)
    return PlainTextResponse(
        content=md_content,
        headers={"Content-Disposition": f'attachment; filename="event_plan_{event_id}.md"'},
    )


@router.get("/{event_id}/export/budget-csv")
async def export_budget_csv(event_id: str) -> PlainTextResponse:
    """Download budget line items as CSV."""
    event = event_service.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event plan not found.")
    csv_content = ExportService.generate_budget_csv(event)
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="budget_{event_id}.csv"'},
    )


@router.get("/{event_id}/export/vendors-csv")
async def export_vendors_csv(event_id: str) -> PlainTextResponse:
    """Download vendors directory as CSV."""
    event = event_service.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event plan not found.")
    csv_content = ExportService.generate_vendors_csv(event)
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="vendors_{event_id}.csv"'},
    )


@router.get("/{event_id}/export/guests-csv")
async def export_guests_csv(event_id: str) -> PlainTextResponse:
    """Download guest list as CSV."""
    event = event_service.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event plan not found.")
    csv_content = ExportService.generate_guests_csv(event)
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="guests_{event_id}.csv"'},
    )

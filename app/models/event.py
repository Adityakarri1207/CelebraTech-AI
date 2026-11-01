"""
Pydantic domain models for CelebraTech AI Event Planner.
Provides strict validation, data sanitization, and serialization.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import html
import uuid
from pydantic import BaseModel, Field, field_validator, model_validator


def generate_uuid() -> str:
    """Generate a unique string ID."""
    return str(uuid.uuid4())


def sanitize_text(value: Optional[str]) -> Optional[str]:
    """Sanitize strings to prevent HTML tag injection while preserving natural text and punctuation."""
    if value is None:
        return None
    cleaned = value.strip().replace("<", "&lt;").replace(">", "&gt;")
    return cleaned


class EventType(str, Enum):
    """Supported celebration and event types."""
    WEDDING = "wedding"
    BIRTHDAY = "birthday"
    COMMUNITY = "community"
    ANNIVERSARY = "anniversary"
    CORPORATE = "corporate"
    OTHER = "other"


class BudgetCategory(str, Enum):
    """Standard budget expense categories."""
    VENUE = "Venue & Rentals"
    CATERING = "Catering & Bar"
    DECOR = "Decor & Floral"
    ENTERTAINMENT = "Entertainment & Music"
    PHOTOGRAPHY = "Photography & Video"
    ATTIRE = "Attire & Styling"
    FAVORS = "Invitations & Favors"
    MISCELLANEOUS = "Miscellaneous & Contingency"


class BudgetItem(BaseModel):
    """Individual line item within an event budget."""
    id: str = Field(default_factory=generate_uuid)
    category: str = Field(default=BudgetCategory.VENUE.value)
    name: str = Field(..., min_length=1, max_length=120)
    estimated_cost: float = Field(default=0.0, ge=0.0)
    actual_cost: float = Field(default=0.0, ge=0.0)
    paid: bool = Field(default=False)
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("name", "notes")
    @classmethod
    def clean_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v)


class BudgetSummary(BaseModel):
    """Calculated financial summary of an event's budget."""
    total_budget: float
    total_estimated: float
    total_actual: float
    remaining_budget: float
    is_over_budget: bool
    over_budget_amount: float
    percentage_spent: float
    category_breakdown: Dict[str, Dict[str, float]]
    cost_saving_recommendations: List[str]
    net_variance: float = Field(default=0.0)
    total_paid: float = Field(default=0.0)
    unpaid_balance: float = Field(default=0.0)
    profit_or_loss: float = Field(default=0.0)
    profit_or_loss_status: str = Field(default="balanced")


class TimelinePhase(str, Enum):
    """Phase of event timeline."""
    PLANNING = "planning"
    DAY_OF = "day_of"


class TimelineItem(BaseModel):
    """Milestone or run-of-show schedule entry."""
    id: str = Field(default_factory=generate_uuid)
    title: str = Field(..., min_length=1, max_length=160)
    time_or_offset: str = Field(..., max_length=80)
    phase: TimelinePhase = Field(default=TimelinePhase.PLANNING)
    description: Optional[str] = Field(default="", max_length=500)
    owner: str = Field(default="Event Host", max_length=80)
    completed: bool = Field(default=False)
    order: int = Field(default=0)

    @field_validator("title", "time_or_offset", "description", "owner")
    @classmethod
    def clean_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v)


class VendorStatus(str, Enum):
    """Progress stage for vendors."""
    RESEARCHING = "Researching"
    CONTACTED = "Contacted"
    QUOTE_RECEIVED = "Quote Received"
    CONTRACT_SIGNED = "Contract Signed"
    DEPOSIT_PAID = "Deposit Paid"
    FULLY_PAID = "Fully Paid"


class VendorItem(BaseModel):
    """Vendor and supplier details with task checklist."""
    id: str = Field(default_factory=generate_uuid)
    category: str = Field(..., min_length=1, max_length=80)
    name: str = Field(..., min_length=1, max_length=120)
    contact_name: Optional[str] = Field(default=None, max_length=100)
    email: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=40)
    website: Optional[str] = Field(default=None, max_length=200)
    status: VendorStatus = Field(default=VendorStatus.RESEARCHING)
    quoted_price: float = Field(default=0.0, ge=0.0)
    actual_paid: Optional[float] = Field(default=None, ge=0.0)
    notes: Optional[str] = Field(default=None, max_length=500)
    checklist_tasks: List[str] = Field(default_factory=list)
    completed_tasks: List[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def handle_vendor_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "contact_person" in data and "contact_name" not in data:
                data["contact_name"] = data["contact_person"]
            if "quoted_cost" in data and "quoted_price" not in data:
                data["quoted_price"] = data["quoted_cost"]
            if "checklist" in data and "checklist_tasks" not in data:
                data["checklist_tasks"] = data["checklist"]
        return data

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

    @field_validator("category", "name", "contact_name", "email", "phone", "notes")
    @classmethod
    def clean_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v)


class PersonalizedIdeaItem(BaseModel):
    """Personalized theme, menu, decor, or activity idea for 3D card display."""
    id: str = Field(default_factory=generate_uuid)
    category: str = Field(..., max_length=50)
    title: str = Field(..., min_length=1, max_length=140)
    tagline: str = Field(..., max_length=200)
    description: str = Field(..., max_length=1000)
    badge: str = Field(default="Curated Idea", max_length=50)
    details: List[str] = Field(default_factory=list)
    flip_content: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("category", "title", "tagline", "description", "badge")
    @classmethod
    def clean_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v)


class ColorSwatch(BaseModel):
    """Visual theme color swatch."""
    name: str = Field(..., max_length=50)
    hex_code: str = Field(..., max_length=10)
    role: str = Field(default="Accent", max_length=50)


class GuestRSVPStatus(str, Enum):
    """Guest attendance status."""
    CONFIRMED = "confirmed"
    DECLINED = "declined"
    PENDING = "pending"


class GuestItem(BaseModel):
    """Guest list and RSVP attendance tracker."""
    id: str = Field(default_factory=generate_uuid)
    name: str = Field(..., min_length=1, max_length=100)
    party_size: int = Field(default=1, ge=1, le=30)
    rsvp_status: GuestRSVPStatus = Field(default=GuestRSVPStatus.PENDING)
    dietary: str = Field(default="Standard", max_length=100)
    table_number: Optional[int] = Field(default=None, ge=1, le=200)
    email_or_phone: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=300)

    @model_validator(mode="before")
    @classmethod
    def handle_guest_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "full_name" in data and "name" not in data:
                data["name"] = data["full_name"]
            if "table_assignment" in data and "table_number" not in data:
                data["table_number"] = data["table_assignment"]
            if "dietary_notes" in data and "dietary" not in data:
                data["dietary"] = data["dietary_notes"]
            if "email" in data and "email_or_phone" not in data:
                data["email_or_phone"] = data["email"]
        return data

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

    @field_validator("table_number", mode="before")
    @classmethod
    def normalize_table_number(cls, v: Any) -> Any:
        if v is None or v == "":
            return None
        if isinstance(v, str):
            import re
            nums = re.findall(r'\d+', v)
            if nums:
                return int(nums[0])
            return None
        return int(v)

    @field_validator("name", "dietary", "email_or_phone", "notes")
    @classmethod
    def clean_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v)


class EventPlan(BaseModel):
    """Comprehensive event representation."""
    id: str = Field(default_factory=generate_uuid)
    title: str = Field(..., min_length=2, max_length=150)
    event_type: EventType = Field(default=EventType.OTHER)
    date: Optional[str] = Field(default=None, max_length=50)
    location: Optional[str] = Field(default=None, max_length=120)
    guest_count: int = Field(default=50, ge=1, le=100000)
    currency: str = Field(default="INR", max_length=5)
    total_budget: float = Field(default=500000.0, ge=0.0)
    theme: Optional[str] = Field(default=None, max_length=120)
    vibe: Optional[str] = Field(default="Celebratory & Elegant", max_length=120)
    budget_items: List[BudgetItem] = Field(default_factory=list)
    timeline_items: List[TimelineItem] = Field(default_factory=list)
    vendors: List[VendorItem] = Field(default_factory=list)
    ideas: List[PersonalizedIdeaItem] = Field(default_factory=list)
    guests: List[GuestItem] = Field(default_factory=list)
    color_palette: List[ColorSwatch] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @field_validator("title", "location", "theme", "vibe")
    @classmethod
    def clean_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v)


class EventCreateRequest(BaseModel):
    """Payload to create or generate a new event."""
    title: str = Field(..., min_length=2, max_length=150)
    event_type: EventType
    date: Optional[str] = Field(default="", max_length=50)
    location: Optional[str] = Field(default="", max_length=120)
    guest_count: int = Field(default=75, ge=1, le=50000)
    total_budget: float = Field(default=1000000.0, ge=0.0)
    currency: str = Field(default="INR", max_length=5)
    theme: Optional[str] = Field(default="", max_length=120)
    vibe: Optional[str] = Field(default="", max_length=120)
    generate_ai_plan: bool = Field(default=True)


class EventUpdateRequest(BaseModel):
    """Payload to update an existing event's metadata."""
    title: Optional[str] = Field(default=None, min_length=2, max_length=150)
    event_type: Optional[EventType] = None
    date: Optional[str] = None
    location: Optional[str] = None
    guest_count: Optional[int] = Field(default=None, ge=1)
    total_budget: Optional[float] = Field(default=None, ge=0.0)
    currency: Optional[str] = None
    theme: Optional[str] = None
    vibe: Optional[str] = None

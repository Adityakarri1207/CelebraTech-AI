"""
Domain exceptions and error hierarchy for CelebraTech AI.
Provides structured, typed exceptions for clean error reporting and OpenAPI compliance.
"""

from typing import Optional, Dict, Any


class CelebraTechError(Exception):
    """Base exception for all domain-specific errors in CelebraTech AI."""

    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class EntityNotFoundError(CelebraTechError):
    """Base exception for missing resources."""

    def __init__(self, entity_name: str, entity_id: str, code: str = "NOT_FOUND") -> None:
        message = f"{entity_name} with ID '{entity_id}' was not found."
        super().__init__(message=message, code=code, status_code=404, details={"entity": entity_name, "id": entity_id})


class EventNotFoundError(EntityNotFoundError):
    """Raised when an event plan does not exist."""

    def __init__(self, event_id: str) -> None:
        super().__init__(entity_name="EventPlan", entity_id=event_id, code="EVENT_NOT_FOUND")


class BudgetItemNotFoundError(EntityNotFoundError):
    """Raised when a budget line item does not exist."""

    def __init__(self, item_id: str) -> None:
        super().__init__(entity_name="BudgetItem", entity_id=item_id, code="BUDGET_ITEM_NOT_FOUND")


class VendorNotFoundError(EntityNotFoundError):
    """Raised when a vendor record does not exist."""

    def __init__(self, vendor_id: str) -> None:
        super().__init__(entity_name="VendorItem", entity_id=vendor_id, code="VENDOR_NOT_FOUND")


class TimelineItemNotFoundError(EntityNotFoundError):
    """Raised when a timeline milestone does not exist."""

    def __init__(self, item_id: str) -> None:
        super().__init__(entity_name="TimelineItem", entity_id=item_id, code="TIMELINE_ITEM_NOT_FOUND")


class GuestNotFoundError(EntityNotFoundError):
    """Raised when a guest does not exist."""

    def __init__(self, guest_id: str) -> None:
        super().__init__(entity_name="GuestItem", entity_id=guest_id, code="GUEST_NOT_FOUND")


class PayloadTooLargeError(CelebraTechError):
    """Raised when an incoming request exceeds the maximum allowed payload size."""

    def __init__(self, max_bytes: int, actual_bytes: int) -> None:
        message = f"Request payload size ({actual_bytes} bytes) exceeds maximum limit ({max_bytes} bytes)."
        super().__init__(message=message, code="PAYLOAD_TOO_LARGE", status_code=413, details={"max_bytes": max_bytes, "actual_bytes": actual_bytes})


class DomainValidationError(CelebraTechError):
    """Raised when domain business rules are violated."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message=message, code="DOMAIN_VALIDATION_ERROR", status_code=422, details=details)

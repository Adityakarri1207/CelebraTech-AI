"""
REST API endpoints for GenAI Event Planning Assistant.
Handles AI plan generation, contextual conversation, and idea brainstorming.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from app.models.ai import (
    AIPromptRequest,
    AIPlanBundle,
    AIChatRequest,
    AIChatResponse,
    AIIdeaGenerationRequest,
)
from app.models.event import PersonalizedIdeaItem
from app.services.ai_planner import AIPlannerService
from app.services.event_service import event_service

router = APIRouter(prefix="/api/ai", tags=["GenAI Assistant"])


@router.post("/generate-plan", response_model=AIPlanBundle)
async def generate_plan(req: AIPromptRequest) -> AIPlanBundle:
    """Generate an end-to-end event plan with budgets, schedules, vendors, and ideas."""
    return AIPlannerService.generate_complete_plan(req)


@router.post("/chat", response_model=AIChatResponse)
async def chat_assistant(req: AIChatRequest) -> AIChatResponse:
    """Conversational GenAI planning assistant aware of current event context."""
    event = event_service.get_event(req.event_id)
    event_context: Optional[Dict[str, Any]] = None
    if event:
        event_context = {
            "title": event.title,
            "type": event.event_type.value,
            "guest_count": event.guest_count,
            "total_budget": event.total_budget,
            "currency": event.currency,
            "theme": event.theme,
            "budget_item_count": len(event.budget_items),
            "timeline_item_count": len(event.timeline_items),
            "vendor_count": len(event.vendors),
        }
    return AIPlannerService.answer_chat_query(req, event_context)


@router.post("/generate-ideas", response_model=PersonalizedIdeaItem)
async def generate_ideas(req: AIIdeaGenerationRequest) -> PersonalizedIdeaItem:
    """Generate focused, high-impact ideas for a specific category."""
    curated = AIPlannerService._build_curated_ideas(
        event_type=req.event_type,
        vibe_str=req.theme or "Festive",
        guest_count=req.guest_count,
    )
    # Match category if present
    for idea in curated:
        if idea.category == req.category:
            return idea
    if curated:
        return curated[0]
    return PersonalizedIdeaItem(
        category=req.category,
        title=f"Custom {req.category.capitalize()} Blueprint",
        tagline="Tailored specifically for your celebration",
        description="A bespoke curated concept designed for high guest engagement and visual impact.",
        details=["Custom tailored styling", "Allergy and preference accommodating", "Budget-conscious"],
        flip_content={"subtitle": "Execution notes", "items": ["Key detail 1", "Key detail 2"]},
    )

"""
Unit tests for AI Planner Service (curated heuristics and conversational assistant).
"""

from app.models.event import EventType
from app.models.ai import AIPromptRequest, AIChatRequest
from app.services.ai_planner import AIPlannerService


def test_generate_complete_wedding_plan():
    """Verify generated bundle for a wedding."""
    req = AIPromptRequest(
        event_type=EventType.WEDDING,
        title="Emma & Noah's Wedding",
        budget=20000.0,
        guest_count=100,
        theme_preference="Garden Romance",
        vibe="Floral and Elegant",
    )
    bundle = AIPlannerService.generate_complete_plan(req)
    assert len(bundle.budget_items) > 5
    assert len(bundle.timeline_items) > 5
    assert len(bundle.vendors) >= 4
    assert len(bundle.ideas) >= 3
    assert "wedding" in bundle.summary_advice.lower() or "emma" in bundle.summary_advice.lower()

    # Ensure 3D card ideas have flip_content
    for idea in bundle.ideas:
        assert isinstance(idea.flip_content, dict)
        assert len(idea.details) > 0


def test_generate_birthday_plan():
    """Verify generated bundle for a birthday."""
    req = AIPromptRequest(
        event_type=EventType.BIRTHDAY,
        title="Leo's 18th Birthday",
        budget=3500.0,
        guest_count=40,
        theme_preference="Retro Arcade",
    )
    bundle = AIPlannerService.generate_complete_plan(req)
    assert any(b.category == "Entertainment & Music" for b in bundle.budget_items)
    assert any(t.phase.value == "day_of" for t in bundle.timeline_items)


def test_chat_assistant_budget_advice():
    """Test AI assistant answers budget optimization queries."""
    chat_req = AIChatRequest(
        event_id="dummy",
        message="How can I cut budget on catering?",
    )
    response = AIPlannerService.answer_chat_query(chat_req, event_context={"title": "Test Gala"})
    assert "save" in response.reply.lower() or "cost" in response.reply.lower() or "bar" in response.reply.lower()
    assert len(response.suggested_actions) > 0


def test_chat_assistant_timeline_advice():
    """Test AI assistant answers timeline and schedule questions."""
    chat_req = AIChatRequest(
        event_id="dummy",
        message="What is the run of show for the day of the event?",
    )
    response = AIPlannerService.answer_chat_query(chat_req, event_context={"title": "Test Gala"})
    assert "run of show" in response.reply.lower() or "timeline" in response.reply.lower() or "first look" in response.reply.lower()

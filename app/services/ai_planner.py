"""
GenAI Planning Engine for CelebraTech AI.
Integrates Google Gemini (via google-genai SDK) with an expert-grade
offline generative knowledge base for 100% reliability, zero downtime,
and highly customized event timelines, budgets, vendor checklists, guests, and 3D card ideas.
"""

from typing import List, Dict, Any, Optional
import json
import logging
from app.config import settings
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
)
from app.models.ai import (
    AIPromptRequest,
    AIPlanBundle,
    AIChatMessage,
    AIChatResponse,
    AIIdeaGenerationRequest,
)
from app.services.budget_service import BudgetService

logger = logging.getLogger("CelebraTech.AIPlanner")


class AIPlannerService:
    """Intelligent AI event generation engine with Gemini API & Offline Knowledge Base."""

    @classmethod
    def generate_complete_plan(cls, req: AIPromptRequest) -> AIPlanBundle:
        """
        Generates a comprehensive event bundle:
        - Itemized budget line items
        - Planning milestones + Day-of run of show schedule
        - Comprehensive vendor checklist
        - 3D-card-ready personalized ideas (themes, menus, activities, playlist, copy)
        - Initial guest RSVP list with dietary preferences
        - Harmonious 5-swatch color palette
        """
        if settings.gemini_api_key:
            try:
                bundle = cls._generate_with_gemini(req)
                if bundle:
                    return bundle
            except Exception as e:
                logger.warning("Gemini API call encountered error; falling back to curated AI engine: %s", e)

        return cls._generate_curated_plan(req)

    @classmethod
    def _generate_with_gemini(cls, req: AIPromptRequest) -> Optional[AIPlanBundle]:
        """Calls official Google GenAI Gemini SDK."""
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.gemini_api_key)
            prompt = f"""
You are an elite, world-class celebration and event planning director.
Create a complete, detailed plan for the following event:
Event Type: {req.event_type.value}
Title: {req.title}
Total Budget: {req.budget} {req.currency}
Guest Count: {req.guest_count}
Location: {req.location or 'Local Venue'}
Theme/Vibe Preference: {req.theme_preference or 'Joyful & Elegant'}
Additional Notes: {req.additional_notes}

Respond strictly in valid JSON matching this schema:
{{
  "summary_advice": "A 2-paragraph inspiring executive summary with key planning tips.",
  "budget_items": [
    {{"category": "Venue & Rentals", "name": "Item name", "estimated_cost": 1500.0, "notes": "Reasoning"}}
  ],
  "timeline_items": [
    {{"title": "Milestone title", "time_or_offset": "e.g. 6 Months Before or 10:00 AM", "phase": "planning", "description": "Details", "owner": "Event Host", "order": 1}}
  ],
  "vendors": [
    {{"category": "Catering & Bar", "name": "Vendor Name", "status": "Researching", "quoted_price": 2000.0, "checklist_tasks": ["Task 1", "Task 2"]}}
  ],
  "ideas": [
    {{
      "category": "theme",
      "title": "Idea Title",
      "tagline": "Short summary",
      "description": "Engaging description",
      "badge": "Trending",
      "details": ["Highlight 1", "Highlight 2"],
      "flip_content": {{"subtitle": "Blueprint", "items": ["Detail 1", "Detail 2"]}}
    }}
  ],
  "color_palette": [
    {{"name": "Color Name", "hex_code": "#E07A5F", "role": "Primary"}}
  ]
}}
"""
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.7,
                ),
            )
            data = json.loads(response.text)

            budget_items = [
                BudgetItem(
                    category=b.get("category", "Miscellaneous & Contingency"),
                    name=b.get("name", "Budget item"),
                    estimated_cost=float(b.get("estimated_cost", 0.0)),
                    notes=b.get("notes", ""),
                )
                for b in data.get("budget_items", [])
            ]
            timeline_items = [
                TimelineItem(
                    title=t.get("title", "Milestone"),
                    time_or_offset=t.get("time_or_offset", "TBD"),
                    phase=TimelinePhase(t.get("phase", "planning")),
                    description=t.get("description", ""),
                    owner=t.get("owner", "Host"),
                    order=int(t.get("order", idx)),
                )
                for idx, t in enumerate(data.get("timeline_items", []))
            ]
            vendors = [
                VendorItem(
                    category=v.get("category", "General"),
                    name=v.get("name", "Vendor"),
                    status=VendorStatus(v.get("status", VendorStatus.RESEARCHING.value)),
                    quoted_price=float(v.get("quoted_price", 0.0)),
                    checklist_tasks=v.get("checklist_tasks", []),
                )
                for v in data.get("vendors", [])
            ]
            ideas = [
                PersonalizedIdeaItem(
                    category=i.get("category", "theme"),
                    title=i.get("title", "Curated Idea"),
                    tagline=i.get("tagline", ""),
                    description=i.get("description", ""),
                    badge=i.get("badge", "AI Recommended"),
                    details=i.get("details", []),
                    flip_content=i.get("flip_content", {}),
                )
                for i in data.get("ideas", [])
            ]
            palette = [
                ColorSwatch(
                    name=c.get("name", "Theme Color"),
                    hex_code=c.get("hex_code", "#F59E0B"),
                    role=c.get("role", "Accent"),
                )
                for c in data.get("color_palette", [])
            ]

            return AIPlanBundle(
                budget_items=budget_items or BudgetService.generate_starter_budget(req.budget, req.event_type, req.guest_count),
                timeline_items=timeline_items,
                vendors=vendors,
                ideas=ideas,
                guests=cls._build_curated_guests(req.event_type),
                color_palette=palette or cls._build_curated_palette(req.event_type),
                summary_advice=data.get("summary_advice", "Personalized celebration plan generated by Gemini AI."),
            )
        except Exception as err:
            logger.error("Error invoking Gemini model: %s", err)
            return None

    @classmethod
    def _generate_curated_plan(cls, req: AIPromptRequest) -> AIPlanBundle:
        """Expert curated deterministic generative engine."""
        budget_items = BudgetService.generate_starter_budget(
            total_budget=req.budget,
            event_type=req.event_type,
            guest_count=req.guest_count,
        )
        timeline_items = cls._build_curated_timeline(req.event_type)
        vendors = cls._build_curated_vendors(req.event_type, req.budget, req.guest_count)
        ideas = cls._build_curated_ideas(req.event_type, req.theme_preference or req.vibe, req.guest_count)
        guests = cls._build_curated_guests(req.event_type)
        palette = cls._build_curated_palette(req.event_type)
        advice = cls._build_curated_advice(req)

        return AIPlanBundle(
            budget_items=budget_items,
            timeline_items=timeline_items,
            vendors=vendors,
            ideas=ideas,
            guests=guests,
            color_palette=palette,
            summary_advice=advice,
        )

    @classmethod
    def _build_curated_palette(cls, event_type: EventType) -> List[ColorSwatch]:
        """Builds a cohesive 5-swatch palette tailored to event aesthetic."""
        if event_type == EventType.WEDDING:
            return [
                ColorSwatch(name="Terracotta Clay", hex_code="#E07A5F", role="Primary Warmth"),
                ColorSwatch(name="Tuscan Sage", hex_code="#81B29A", role="Secondary Foliage"),
                ColorSwatch(name="Champagne Silk", hex_code="#F2CC8F", role="Neutral Elegance"),
                ColorSwatch(name="Brushed Antique Gold", hex_code="#D4AF37", role="Metallic Accent"),
                ColorSwatch(name="Midnight Slate", hex_code="#3D405B", role="Formal Contrast"),
            ]
        elif event_type == EventType.BIRTHDAY:
            return [
                ColorSwatch(name="Neon Magenta", hex_code="#FF007F", role="Primary Glow"),
                ColorSwatch(name="Electric Cyan", hex_code="#00F5FF", role="Secondary Beam"),
                ColorSwatch(name="Cyber Violet", hex_code="#8B00FF", role="Lounge Ambiance"),
                ColorSwatch(name="Liquid Gold", hex_code="#FFD700", role="VIP Shimmer"),
                ColorSwatch(name="Obsidian Black", hex_code="#121212", role="Deep Backdrop"),
            ]
        elif event_type == EventType.COMMUNITY:
            return [
                ColorSwatch(name="Meadow Green", hex_code="#2D6A4F", role="Primary Eco"),
                ColorSwatch(name="Festival Gold", hex_code="#FFB703", role="Secondary Joy"),
                ColorSwatch(name="Warm Amber", hex_code="#FB8500", role="Accent Harvest"),
                ColorSwatch(name="Civic Blue", hex_code="#219EBC", role="Signage & Trust"),
                ColorSwatch(name="Natural Canvas", hex_code="#FDF0D5", role="Banner Neutral"),
            ]
        else:
            return [
                ColorSwatch(name="Royal Emerald", hex_code="#10B981", role="Primary"),
                ColorSwatch(name="Sunset Rose", hex_code="#EC4899", role="Secondary"),
                ColorSwatch(name="Imperial Purple", hex_code="#8B5CF6", role="Accent"),
                ColorSwatch(name="Solar Gold", hex_code="#F59E0B", role="Highlight"),
                ColorSwatch(name="Midnight Blue", hex_code="#1E293B", role="Base"),
            ]

    @classmethod
    def _build_curated_guests(cls, event_type: EventType) -> List[GuestItem]:
        """Builds realistic sample guest list with RSVP status and dietary tags."""
        if event_type == EventType.WEDDING:
            return [
                GuestItem(name="Eleanor & David Vance", party_size=2, rsvp_status=GuestRSVPStatus.CONFIRMED, dietary="Gluten-Free", table_number=1, email_or_phone="eleanor.v@example.com", notes="Aunt & Uncle of Bride"),
                GuestItem(name="Marcus Aurelius & Guest", party_size=2, rsvp_status=GuestRSVPStatus.CONFIRMED, dietary="Vegan", table_number=1, email_or_phone="marcus@example.com", notes="College roommate"),
                GuestItem(name="Chloe Bennett", party_size=1, rsvp_status=GuestRSVPStatus.PENDING, dietary="Standard", table_number=2, email_or_phone="chloe.b@example.com", notes="RSVP reminder sent"),
                GuestItem(name="Liam & Sophia Patel", party_size=2, rsvp_status=GuestRSVPStatus.CONFIRMED, dietary="Halal", table_number=3, email_or_phone="liam.patel@example.com", notes="High school friend"),
                GuestItem(name="Arthur Pendelton", party_size=1, rsvp_status=GuestRSVPStatus.DECLINED, dietary="Standard", table_number=None, email_or_phone="arthur@example.com", notes="Sending gift by mail"),
                GuestItem(name="Elena Rostova", party_size=1, rsvp_status=GuestRSVPStatus.CONFIRMED, dietary="Nut Allergy", table_number=2, email_or_phone="elena.r@example.com", notes="Maid of honor sister"),
            ]
        elif event_type == EventType.BIRTHDAY:
            return [
                GuestItem(name="Samira Khan", party_size=2, rsvp_status=GuestRSVPStatus.CONFIRMED, dietary="Nut Allergy", table_number=1, email_or_phone="samira.k@example.com", notes="VIP Lounge table"),
                GuestItem(name="Kevin Chen & Jordan", party_size=2, rsvp_status=GuestRSVPStatus.CONFIRMED, dietary="Standard", table_number=2, email_or_phone="kchen@example.com", notes="Organizing surprise toast"),
                GuestItem(name="Priya Sharma", party_size=1, rsvp_status=GuestRSVPStatus.PENDING, dietary="Vegetarian", table_number=1, email_or_phone="priya@example.com", notes="Waiting on travel schedule"),
                GuestItem(name="Diego Morales", party_size=1, rsvp_status=GuestRSVPStatus.CONFIRMED, dietary="Standard", table_number=2, email_or_phone="diego@example.com", notes="DJ equipment helper"),
            ]
        else:
            return [
                GuestItem(name="Mayor Sarah Higgins", party_size=2, rsvp_status=GuestRSVPStatus.CONFIRMED, dietary="Standard", table_number=1, email_or_phone="mayor@citygov.org", notes="Opening speech speaker"),
                GuestItem(name="Greenwood Volunteer Squad", party_size=8, rsvp_status=GuestRSVPStatus.CONFIRMED, dietary="Mixed (4 Veg, 4 Std)", table_number=2, email_or_phone="volunteers@greenwood.org", notes="Site cleanup captains"),
                GuestItem(name="Rotary Club Delegation", party_size=4, rsvp_status=GuestRSVPStatus.PENDING, dietary="Standard", table_number=3, email_or_phone="rotary@greenwood.org", notes="Sponsor badge pickup"),
            ]

    @classmethod
    def _build_curated_timeline(cls, event_type: EventType) -> List[TimelineItem]:
        """Builds milestones and day-of run-of-show schedule."""
        items: List[TimelineItem] = []

        if event_type == EventType.WEDDING:
            planning_milestones = [
                ("Lock Venue & Choose Wedding Date", "9-12 Months Before", "Tour short-listed venues, sign contract, and secure deposit.", "Couple & Planner"),
                ("Book Key Vendors (Photo, Video, Catering, DJ)", "6-9 Months Before", "Review portfolios, conduct tastings, and reserve lead creatives.", "Lead Planner"),
                ("Send Save-the-Dates & Launch Wedding Website", "6 Months Before", "Distribute digital or printed cards with hotel accommodation blocks.", "Couple"),
                ("Select Wedding Attire & Bridesmaid/Groomsmen Outfits", "4-5 Months Before", "Schedule initial fittings, coordinate color palettes and accessories.", "Couple"),
                ("Finalize Floral Design, Decor & Linens", "3 Months Before", "Review table mockups, floral arch dimensions, and candle styling.", "Floral Lead"),
                ("Mail Formal Invitations with RSVP Deadline", "8-10 Weeks Before", "Track RSVPs online and collect dietary requirements and song requests.", "Couple"),
                ("Final Walkthrough & Day-of Timeline Sync", "2-3 Weeks Before", "Walk the space with coordinator, photographer, and caterer.", "Coordinator"),
                ("Rehearsal Ceremony & Welcome Dinner", "1 Day Before", "Practice processional, hand off marriage license and emergency kit.", "Officiant & Wedding Party"),
            ]
            day_of_schedule = [
                ("Bridal Party Hair & Makeup Begins", "08:30 AM", "Lead artists set up in bridal suite with mimosa bar & light snacks.", "Hair & Makeup Lead"),
                ("Vendor Load-In & Floral Arch Construction", "10:00 AM", "Decorators, florists, and rental teams arrive at the venue.", "Venue Coordinator"),
                ("Photographer Arrives for Detail & Getting-Ready Shots", "11:30 AM", "Capture dress, rings, invitations, and candid preparations.", "Lead Photographer"),
                ("First Look & Private Couple Portraits", "01:30 PM", "Quiet, intimate reveal followed by wedding party and family portraits.", "Photographer & Couple"),
                ("Ceremony Sound Check & Musician Prelude", "03:00 PM", "Live musicians begin playing welcoming prelude as guests arrive.", "Audio/Musicians"),
                ("Processional & Wedding Ceremony", "03:30 PM", "Exchange of vows and rings, first kiss, and joyous recessional.", "Officiant"),
                ("Cocktail Hour & Passed Hors d'oeuvres", "04:15 PM", "Guests enjoy signature drinks, acoustic music, and lawn games.", "Catering Staff"),
                ("Grand Reception Entrance & First Dance", "05:30 PM", "Exciting introduction of newlyweds followed immediately by first dance.", "DJ / MC"),
                ("Plated Dinner Service & Champagne Toasts", "06:15 PM", "Warm welcome by hosts, best man, maid of honor, and parents.", "Catering & Speakers"),
                ("Cake Cutting & Dessert Table Unveiling", "07:30 PM", "Sweet celebration with coffee station and dessert bar.", "Couple & Baker"),
                ("Dance Floor Opens & Party Celebration", "08:00 PM", "High-energy dance music, photo booth fun, and glow sticks.", "DJ"),
                ("Late-Night Snacks (Slider / Taco Station)", "09:30 PM", "Fuel guests with gourmet savory comfort snacks.", "Catering"),
                ("Sparkler Grand Send-Off & Teardown", "10:30 PM", "Sparkler pathway outside venue; vendor breakdown concludes.", "Coordinator & Cleaners"),
            ]
        elif event_type == EventType.BIRTHDAY:
            planning_milestones = [
                ("Choose Theme, Guest List & Date", "6-8 Weeks Before", "Decide on milestone theme (e.g. Retro Disco, Enchanted Garden, Hollywood Glam).", "Host"),
                ("Reserve Venue or Private Dining Room", "4-6 Weeks Before", "Confirm capacity, sound restrictions, and external catering permissions.", "Host"),
                ("Book Entertainment (DJ, Magician, Photo Booth)", "4 Weeks Before", "Hire focal performers and reserve interactive photo booth.", "Party Coordinator"),
                ("Order Custom Birthday Cake & Specialty Treats", "3 Weeks Before", "Submit design reference, flavor profile, and dietary requests.", "Host"),
                ("Send Interactive Digital Invitations", "3-4 Weeks Before", "Collect RSVPs, favorite songs, and guest drink preferences.", "Host"),
                ("Assemble Decor, Backdrops & Party Favors", "1 Week Before", "Prepare balloon arch kit, customized swag bags, and signage.", "Host / Decor Team"),
                ("Confirm Final Headcount with Caterer", "3 Days Before", "Finalize menu quantities and seating configuration.", "Caterer"),
            ]
            day_of_schedule = [
                ("Venue Access & Backdrop Installation", "02:00 PM", "Assemble balloon arches, photobooth, lighting, and table signage.", "Host / Decorator"),
                ("Catering & Cake Delivery", "03:30 PM", "Setup dessert table, chilled drinks station, and warmer trays.", "Catering Lead"),
                ("DJ Sound Check & Ambient Music Setup", "04:15 PM", "Test wireless microphone, lighting rig, and party playlist.", "DJ / Sound Tech"),
                ("Guests Arrive, Welcome Drinks & Photo Wall", "05:00 PM", "Signature cocktail/mocktail welcome; candid photos at backdrop.", "Host & Greeter"),
                ("Interactive Party Games & Icebreakers", "06:00 PM", "Engaging trivia, birthday roast/toast, or customized group games.", "MC / Host"),
                ("Buffet Dinner & Bites Service", "06:45 PM", "Delicious dinner accompanied by upbeat background lounge beats.", "Catering"),
                ("Birthday Song, Candle Blowout & Cake Cutting", "07:45 PM", "Group gathering around cake; speeches and gift unveilings.", "Everyone"),
                ("Dance Floor Celebration & Party Favors", "08:15 PM", "Party hits, high-energy dancing, and parting gift bags.", "DJ & Host"),
                ("Wrap-Up & Clean-Up", "10:00 PM", "Pack gifts, break down personal decor, and hand over venue keys.", "Host & Helpers"),
            ]
        elif event_type == EventType.COMMUNITY:
            planning_milestones = [
                ("Define Event Purpose & Committee Formation", "12-16 Weeks Before", "Form planning subcommittee (permits, sponsors, activities, logistics).", "Committee Chair"),
                ("Secure Municipal Permits & Park/Street Approvals", "10-12 Weeks Before", "Submit sound permits, street closure petitions, and insurance certificates.", "Logistics Lead"),
                ("Outreach to Community Sponsors & Food Trucks", "8-10 Weeks Before", "Recruit local vendors, artisans, and financial sponsors.", "Sponsorship Lead"),
                ("Design & Launch Community Promotion Campaign", "6-8 Weeks Before", "Distribute flyers, neighborhood posters, and social media announcements.", "Marketing Lead"),
                ("Recruit & Train Event Volunteers", "3-4 Weeks Before", "Assign roles for registration, crowd greeting, first aid, and trash cleanup.", "Volunteer Coordinator"),
                ("Finalize Stage Schedule & Safety Logistics", "1-2 Weeks Before", "Confirm emergency protocol, port-a-potty delivery, and generator power.", "Safety Lead"),
            ]
            day_of_schedule = [
                ("Site Setup, Generators & Stage Construction", "07:00 AM", "Erect main canopy, stage rig, sound system, and waste stations.", "Logistics Crew"),
                ("Food Trucks & Vendor Stall Arrival", "08:30 AM", "Park food trucks, inspect health certificates, setup artisan tables.", "Vendor Lead"),
                ("Volunteer Briefing & Walkie-Talkie Check", "09:30 AM", "Issue high-visibility vests, badges, and review station duties.", "Volunteer Coordinator"),
                ("Gates Open & Welcome Brass Band / Drumline", "10:00 AM", "Community kickoff with welcoming remarks from neighborhood leaders.", "MC / Community Chair"),
                ("Kids Activity Zone & Lawn Games Open", "10:30 AM", "Face painting, bounce castle, 3-legged race, and craft tents.", "Activity Leads"),
                ("Main Stage Live Music & Cultural Showcases", "12:00 PM", "Showcase local bands, dance troupes, and school choirs.", "Stage Manager"),
                ("Community Awards & Raffle Prize Drawing", "02:30 PM", "Recognize neighborhood champions and draw ticket winners.", "Committee Chair"),
                ("Headliner Band Performance", "03:30 PM", "High-energy musical finale for all age groups.", "Stage Manager"),
                ("Closing Remarks & Community Cleanup Blitz", "05:00 PM", "Trash collection, volunteer appreciation, and venue handoff.", "All Volunteers"),
            ]
        else:
            planning_milestones = [
                ("Establish Event Objectives & Budget", "8 Weeks Before", "Outline scope, target attendees, and key milestones.", "Host"),
                ("Confirm Venue & Required Audio-Visual Gear", "6 Weeks Before", "Reserve space with appropriate capacity and tech.", "Coordinator"),
                ("Curate Food, Beverages & Entertainment", "4 Weeks Before", "Select catering menus and book keynote/entertainment.", "Host"),
                ("Send Invitations with Online RSVP", "3 Weeks Before", "Monitor attendee confirmations and preferences.", "Host"),
                ("Final Logistics & Materials Assembly", "1 Week Before", "Prepare name badges, signage, and handouts.", "Team"),
            ]
            day_of_schedule = [
                ("Facility Access & Setup", "08:00 AM", "Organize seating, AV equipment, and sign-in desks.", "Coordinator"),
                ("Guest Registration & Welcome Refreshments", "09:30 AM", "Check in guests with warm coffee and light snacks.", "Greeter"),
                ("Main Program / Opening Presentation", "10:15 AM", "Keynote address or celebratory welcome speech.", "Host"),
                ("Networking Luncheon & Activities", "12:30 PM", "Gourmet meal and interactive group engagement.", "Caterer"),
                ("Closing Toasts & Departures", "03:00 PM", "Wrap-up remarks and gift handouts.", "Host"),
            ]

        for idx, (title, time_val, desc, owner) in enumerate(planning_milestones):
            items.append(
                TimelineItem(
                    title=title,
                    time_or_offset=time_val,
                    phase=TimelinePhase.PLANNING,
                    description=desc,
                    owner=owner,
                    completed=False,
                    order=idx + 1,
                )
            )

        for idx, (title, time_val, desc, owner) in enumerate(day_of_schedule):
            items.append(
                TimelineItem(
                    title=title,
                    time_or_offset=time_val,
                    phase=TimelinePhase.DAY_OF,
                    description=desc,
                    owner=owner,
                    completed=False,
                    order=len(planning_milestones) + idx + 1,
                )
            )

        return items

    @classmethod
    def _build_curated_vendors(
        cls,
        event_type: EventType,
        total_budget: float,
        guest_count: int,
    ) -> List[VendorItem]:
        """Builds vendor directory with action checklists tailored to the event."""
        vendors: List[VendorItem] = []

        if event_type == EventType.WEDDING:
            vendors_spec = [
                (
                    "Venue & Catering Manager",
                    "The Grand Estate & Ballroom",
                    total_budget * 0.35,
                    VendorStatus.QUOTE_RECEIVED,
                    [
                        "Review venue rental package contract",
                        "Confirm table & chair floorplan layout",
                        "Schedule private catering menu tasting",
                        "Verify alcohol licensing & outside catering fees",
                        "Provide final guest headcount 14 days before",
                    ],
                ),
                (
                    "Lead Photographer & Videographer",
                    "Lumière Wedding Studios",
                    total_budget * 0.12,
                    VendorStatus.CONTRACT_SIGNED,
                    [
                        "Review portfolio and photography style (candid vs editorial)",
                        "Create required family portrait shot list",
                        "Schedule golden hour couple session timing",
                        "Confirm drone flight permissions at venue",
                        "Deposit paid (50% retainer)",
                    ],
                ),
                (
                    "Florist & Aesthetic Decorator",
                    "Bloom & Petal Couture",
                    total_budget * 0.08,
                    VendorStatus.CONTACTED,
                    [
                        "Create visual moodboard with color swatches",
                        "Design ceremony floral arch & aisle markers",
                        "Select bouquets, boutonnieres, and table centerpieces",
                        "Arrange ceremony floral reuse for reception tables",
                    ],
                ),
                (
                    "DJ, MC & Live Acoustic Duo",
                    "Soundwave Entertainment Collective",
                    total_budget * 0.07,
                    VendorStatus.RESEARCHING,
                    [
                        "Submit 'Must-Play' and 'Do-Not-Play' song lists",
                        "Provide names and pronunciations for wedding party entrance",
                        "Confirm ceremony wireless lavalier microphones",
                        "Verify dance floor uplighting and sound rig specs",
                    ],
                ),
                (
                    "Artisan Cake & Dessert Patisserie",
                    "Sweet Serenade Confections",
                    total_budget * 0.03,
                    VendorStatus.RESEARCHING,
                    [
                        "Order cake tasting sample box (3 flavors)",
                        "Select 3-tier exterior finish (textured buttercream vs fondant)",
                        "Coordinate delivery time and floral cake toppers with florist",
                        "Confirm gluten-free / vegan cupcakes for dietary guests",
                    ],
                ),
            ]
        elif event_type == EventType.BIRTHDAY:
            vendors_spec = [
                (
                    "Party Lounge / Private Venue",
                    "Velvet Skyline Lounge",
                    total_budget * 0.25,
                    VendorStatus.CONTRACT_SIGNED,
                    [
                        "Sign private room rental agreement",
                        "Confirm AV projector for birthday photo montage",
                        "Coordinate bar packages and minimum spend",
                    ],
                ),
                (
                    "Gourmet Catering & Grazing Tables",
                    "Artisan Feast Catering",
                    total_budget * 0.30,
                    VendorStatus.QUOTE_RECEIVED,
                    [
                        "Select sliders, gourmet flatbreads, and taco bar menu",
                        "Customize signature celebration cocktails",
                        "Arrange appetizer passed service during first hour",
                    ],
                ),
                (
                    "DJ & High-Energy Host",
                    "Groove Beat Productions",
                    total_budget * 0.15,
                    VendorStatus.CONTACTED,
                    [
                        "Share favorite music eras and celebration anthem",
                        "Coordinate surprise entrance music cue",
                        "Confirm party lighting and smoke/bubble effect",
                    ],
                ),
                (
                    "Custom Balloon Stylist & Photo Backdrop",
                    "Pop & Sparkle Installations",
                    total_budget * 0.10,
                    VendorStatus.RESEARCHING,
                    [
                        "Design custom number marquee or neon sign backdrop",
                        "Select metallic, chrome, and pastel balloon palette",
                        "Schedule installation 2 hours prior to guest arrival",
                    ],
                ),
                (
                    "Celebration Bakery",
                    "Sugar Cloud Custom Bakery",
                    total_budget * 0.08,
                    VendorStatus.RESEARCHING,
                    [
                        "Choose theme cake topper and sparkler candles",
                        "Confirm delivery window and cake stand rental",
                    ],
                ),
            ]
        elif event_type == EventType.COMMUNITY:
            vendors_spec = [
                (
                    "Parks & Recreation Municipal Department",
                    "City Parks Administration",
                    total_budget * 0.20,
                    VendorStatus.CONTRACT_SIGNED,
                    [
                        "Submit special event permit application",
                        "Secure amplified sound & live performance permit",
                        "Provide Certificate of General Liability Insurance",
                    ],
                ),
                (
                    "Stage, Sound & AV Production",
                    "Apex Concert Sound & Staging",
                    total_budget * 0.20,
                    VendorStatus.QUOTE_RECEIVED,
                    [
                        "Reserve portable covered stage and sound line array",
                        "Confirm 4 wireless microphones and monitors for bands",
                        "Inspect on-site power or arrange whisper-quiet generator",
                    ],
                ),
                (
                    "Local Gourmet Food Trucks Alliance",
                    "Metro Food Truck Network",
                    total_budget * 0.15,
                    VendorStatus.CONTACTED,
                    [
                        "Recruit diverse food trucks (Tacos, BBQ, Vegan, Gelato)",
                        "Verify health inspection certificates and mobile permits",
                        "Designate parking layout and trash collection receptacles",
                    ],
                ),
                (
                    "Sanitation, Port-a-Potties & First Aid",
                    "CleanEvent Solutions",
                    total_budget * 0.12,
                    VendorStatus.RESEARCHING,
                    [
                        "Order ADA-accessible portable restrooms and handwash stations",
                        "Contract certified on-site EMT / First Aid responder",
                        "Arrange post-event municipal waste dumpster collection",
                    ],
                ),
            ]
        else:
            vendors_spec = [
                (
                    "Event Venue & Facilities",
                    "Metropolitan Hall",
                    total_budget * 0.35,
                    VendorStatus.QUOTE_RECEIVED,
                    ["Review contract", "Confirm seating capacity", "Verify parking"],
                ),
                (
                    "Corporate / Banquet Catering",
                    "Summit Culinary Group",
                    total_budget * 0.30,
                    VendorStatus.CONTACTED,
                    ["Review menu options", "Check dietary preferences", "Confirm service staff"],
                ),
                (
                    "AV & Entertainment Production",
                    "Prime Audio-Visuals",
                    total_budget * 0.15,
                    VendorStatus.RESEARCHING,
                    ["Confirm projector & screen", "Check microphones", "Setup background audio"],
                ),
            ]

        for cat, name, quote, status, tasks in vendors_spec:
            vendors.append(
                VendorItem(
                    category=cat,
                    name=name,
                    quoted_price=round(quote, 2),
                    status=status,
                    notes=f"Key supplier for {event_type.value} execution.",
                    checklist_tasks=tasks,
                    completed_tasks=[tasks[0]] if status in [VendorStatus.CONTRACT_SIGNED, VendorStatus.DEPOSIT_PAID] else [],
                )
            )

        return vendors

    @classmethod
    def _build_curated_ideas(
        cls,
        event_type: EventType,
        vibe_str: str,
        guest_count: int,
    ) -> List[PersonalizedIdeaItem]:
        """Creates rich, personalized ideas styled specifically for the 3D flip card visual format."""
        if event_type == EventType.WEDDING:
            ideas = [
                PersonalizedIdeaItem(
                    category="theme",
                    title="Enchanted Tuscan Sunset & Olive Branch Chic",
                    tagline="Earthy terracotta, warm amber glow, and timeless Mediterranean romance",
                    description="Infuse your celebration with organic textures, olive wood accents, travertine stone pedestals, and abundant olive branch garlands bathed in flickering candlelight.",
                    badge="Trending 2026",
                    details=[
                        "Color Palette: Terracotta, Sage Green, Champagne, and Brushed Antique Gold",
                        "Atmosphere: Intimate, candle-drenched tablescapes with rustic linen runners",
                        "Attire Guideline: Black-Tie Optional with Tuscan Summer Elegance",
                    ],
                    flip_content={
                        "subtitle": "Execution Blueprints & Decor Specs",
                        "items": [
                            "Florals: Fresh Tuscan olive branches, white garden roses, ranunculus, and dried wheat stalks.",
                            "Lighting Architecture: 400+ dripless taper candles inside hurricane glass chimneys paired with overhead fairy canopy.",
                            "Signage: Frosted acrylic or hand-torn deckled edge cotton paper with gold calligraphy.",
                            "Tableware: Textured stoneware ceramic plates, gold matte cutlery, and ribbed crystal wine glasses.",
                            "Pro-Tip: Repurpose aisle floral ground arrangements around the sweetheart table for double the impact at zero extra cost.",
                        ],
                    },
                ),
                PersonalizedIdeaItem(
                    category="menu",
                    title="Artisanal Farm-to-Table Feast & Signature Cocktails",
                    tagline="Locally sourced, interactive dining experience celebrating seasonal flavor",
                    description="Elevate dinner beyond ordinary banquet fare with interactive live plating, house-made focaccia boards, and dual personalized bride & groom signature drinks.",
                    badge="Chef Curated",
                    details=[
                        "Passed Canapés: Truffled Wild Mushroom Crostini & Fig-Prosciutto Skewers",
                        "Plated Entrée: Rosemary Pan-Seared Beef Tenderloin & Lemon Thyme Sea Bass",
                        "Signature Cocktails: 'The Golden Vow' (Bourbon & Smoked Peach) & 'Blushing Bride' (Elderflower Prosecco)",
                    ],
                    flip_content={
                        "subtitle": "Recipe Secrets & Bar Calculation",
                        "items": [
                            "Dietary Inclusivity: Dedicated Wild Mushroom Risotto for Vegan/Gluten-Free guests.",
                            "Signature Drink Recipe: 1.5 oz Bourbon, 0.75 oz Smoked Peach Puree, 0.5 oz Lemon Juice, splash of ginger beer.",
                            "Bar Sizing Formula: Plan for 1.5 drinks per guest for Hour 1, then 1 drink/guest/hour thereafter.",
                            "Late Night Craving: Warm mini cider donuts and espresso martini shooters served at 9:30 PM.",
                            "Wine Pairing: Crisp Sauvignon Blanc for first course; full-bodied Chianti Classico for mains.",
                        ],
                    },
                ),
                PersonalizedIdeaItem(
                    category="activities",
                    title="Audio Guestbook Telephone & Interactive Polaroid Wall",
                    tagline="Vintage audio keepsakes paired with instant retro photographic memories",
                    description="Replace the dust-collecting paper guestbook with a vintage rotary telephone where guests pick up the receiver to record heartfelt audio messages and laughter.",
                    badge="Guest Favorite",
                    details=[
                        "Vintage Rotary Phone station: 'Pick up, listen to the beep, leave your love message'",
                        "Instant Polaroid Station: Guests snap photos, write a memory, and peg it on a lit wire grid",
                        "Live Silhouette Artist or Watercolor Painter capturing guests during cocktail hour",
                    ],
                    flip_content={
                        "subtitle": "Setup Checklist & Tech Notes",
                        "items": [
                            "Station Placement: Place telephone in a quieter foyer or lounge away from booming subwoofer speakers.",
                            "Signage Copy: 'Leave a message for Aditya & Partner! Give us marriage advice, funny secrets, or heartfelt wishes.'",
                            "Polaroid Film Math: Buy 2 film packs per 10 guests (e.g. 150 shots for 75 guests) plus metallic gel pens.",
                            "Digital Deliverable: Audio guestbook service compiles all recordings into a custom vinyl record or MP3 soundwave.",
                        ],
                    },
                ),
                PersonalizedIdeaItem(
                    category="playlist",
                    title="Acoustic Romance to High-Voltage Dance Floor Anthem",
                    tagline="Carefully orchestrated musical journey from daytime romance to midnight fever",
                    description="Keep energy soaring without awkward silences using curated musical transitions that bridge generational favorites with modern chart toppers.",
                    badge="Soundtrack",
                    details=[
                        "Ceremony Walk: Classical string quartet rendition of modern indie ballads",
                        "Cocktail Vibe: Bossa Nova, French cafe jazz, and tropical acoustic covers",
                        "Peak Dance Anthem: Seamless blend of Motown classics, 90s/00s nostalgic pop, and euphoric modern dance",
                    ],
                    flip_content={
                        "subtitle": "The Guaranteed Dance Floor Formulas",
                        "items": [
                            "Grand Entrance Track: 'Can't Take My Eyes Off You' (Surf Mesa Remix) or 'Signed, Sealed, Delivered'.",
                            "First Dance: 'Beyond' by Leon Bridges or 'Until I Found You' by Stephen Sanchez.",
                            "Cake Cutting Vibe: 'How Sweet It Is' (James Taylor) or 'Sugar' (Maroon 5).",
                            "Crowd Magnet at 9 PM: 'September' by Earth, Wind & Fire transitioning directly into modern disco.",
                            "The Do-Not-Play Guardrail: Explicitly ban 'Chicken Dance', 'Macarena', and slow songs after 8:30 PM.",
                        ],
                    },
                ),
                PersonalizedIdeaItem(
                    category="invitation_copy",
                    title="Elegant Invitation Suite & Toast Speech Toolkit",
                    tagline="Refined, warm RSVP copy and effortless stress-free wedding toast formulas",
                    description="Ready-to-use bespoke invitation wording, website RSVP questions, and a structured speech template for parents, best man, or maid of honor.",
                    badge="Copywriting",
                    details=[
                        "Invitation Header: 'Together with their families, invite you to share in the joy...'",
                        "Fun RSVP Prompt: 'I promise to dance if you play: _________'",
                        "Toast Framework: Hook -> Childhood Memory -> Why they are perfect together -> Heartfelt Toast",
                    ],
                    flip_content={
                        "subtitle": "Plug-and-Play Speech Blueprint",
                        "items": [
                            "Step 1 - The Warm Welcome (45s): Thank everyone for traveling, acknowledge parents and hosts.",
                            "Step 2 - The Personal Story (90s): Share a humorous, heartwarming anecdote showing their true character.",
                            "Step 3 - The Spark (60s): Describe the exact moment you noticed how happy they were with their partner.",
                            "Step 4 - The Marriage Advice (30s): Offer one sincere, witty piece of wisdom.",
                            "Step 5 - The Climax: 'Raise your glasses to a lifetime of adventures, laughter, and unbreakable love. To the newlyweds!'",
                        ],
                    },
                ),
            ]
        elif event_type == EventType.BIRTHDAY:
            ideas = [
                PersonalizedIdeaItem(
                    category="theme",
                    title="Neon Noir & Retro Cyber Lounge",
                    tagline="Vibrant ultraviolet hues, moody glow, and ultra-stylish retro vibes",
                    description="Step into an electric celebration featuring customized LED neon name signs, vaporwave gradient uplighting, glowing cocktail glassware, and sleek velvet lounge seating.",
                    badge="Trending Party",
                    details=[
                        "Color Scheme: Deep Midnight Indigo, Neon Magenta, Electric Cyan, and Chrome",
                        "Dress Code: Cocktail attire with a splash of neon or metallic shimmer",
                        "Visual Centerpiece: 8-foot custom Neon Sign photo backdrop with smoked acrylic pedestals",
                    ],
                    flip_content={
                        "subtitle": "Production Specs & DIY Hacks",
                        "items": [
                            "Lighting: UV blacklights hidden in corners paired with wireless battery-powered RGB tubes.",
                            "Glow Barware: LED ice cubes and tonic water ice cubes (naturally fluoresces under UV light).",
                            "Custom Neon Sign: 'Forever 21' / 'Fabulous 30' / 'Level 50 Unlocked' custom rental.",
                            "Music Pairing: Nu-Disco, French house, and 80s synthwave dance anthems.",
                        ],
                    },
                ),
                PersonalizedIdeaItem(
                    category="menu",
                    title="Gourmet Street Food Stations & Liquid Nitrogen Ice Cream",
                    tagline="Fun, interactive bite-sized gastronomy with show-stopping dessert theatrics",
                    description="Skip the stiff banquet tables for dynamic food stations where chefs craft artisanal tacos, bao buns, and flash-freeze personalized ice cream with bubbling liquid nitrogen clouds.",
                    badge="Crowd Pleaser",
                    details=[
                        "Station 1: Korean BBQ Pork Belly Bao Buns with pickled cucumbers & chili crisp",
                        "Station 2: Handcrafted Truffle Parmesan Sliders with bacon-onion jam",
                        "Showstopper Bar: Nitro flash-frozen salted caramel ice cream with edible 24k gold leaf",
                    ],
                    flip_content={
                        "subtitle": "Catering Logistics & Allergen Matrix",
                        "items": [
                            "Veggie/Vegan Alternative: Crispy Jackfruit Bao & Beyond Meat sliders with vegan aioli.",
                            "Cocktail Feature: 'Birthday Glow Up' - Empress 1908 gin, elderflower, yuzu tonic, edible glitter.",
                            "Mocktail Version: Butterfly pea flower tea, honey lavender syrup, and sparkling lemonade.",
                            "Portion Sizing: Plan 6-8 savory bites per person across a 3-hour evening party.",
                        ],
                    },
                ),
                PersonalizedIdeaItem(
                    category="activities",
                    title="Milestone Trivia Roast & High-Definition 360 Video Booth",
                    tagline="Hilarious group participation and red-carpet worthy slow-motion videos",
                    description="Entertain guests with smartphone-based live pub trivia about the birthday star followed by a revolving 360-degree video platform with confetti cannons.",
                    badge="Interactive Hit",
                    details=[
                        "Kahoot / QR-Code Trivia: 'How well do you REALLY know the birthday star?'",
                        "360 Slow-Mo Video Platform with prop money guns, oversized shades, and sparklers",
                        "Collaborative Time Capsule / Video Message Booth for future milestones",
                    ],
                    flip_content={
                        "subtitle": "Game Mechanics & Prize Ideas",
                        "items": [
                            "Trivia Setup: 15 multiple-choice questions with baby photos and funny teenage embarrassing stories.",
                            "Prize Pack: Custom trophy 'Certified Best Friend' + a bottle of champagne or gourmet gift basket.",
                            "360 Booth Tech: Ensure 10x10ft clear floor area and reliable 5GHz Wi-Fi for instant guest AirDrop.",
                        ],
                    },
                ),
            ]
        else:
            ideas = [
                PersonalizedIdeaItem(
                    category="theme",
                    title="Harmony Harvest & Neighborhood Unity Festival",
                    tagline="Inclusive, vibrant, community-first outdoor celebration for all generations",
                    description="Transform municipal park grounds into a bustling celebration of neighborhood culture with artisan craft pavilions, live acoustic stages, and interactive community art murals.",
                    badge="Community Impact",
                    details=[
                        "Visual Identity: Eco-friendly burlap banners, solar fairy lanterns, and wildflower centerpieces",
                        "Audience Scope: Multi-generational from toddlers to seniors",
                        "Core Values: Zero-waste sustainability, local vendor promotion, and civic togetherness",
                    ],
                    flip_content={
                        "subtitle": "Logistical Blueprint & Permits",
                        "items": [
                            "Permit Requirements: Municipal park assembly permit, amplified sound waiver, fire marshal inspection.",
                            "Waste Diversion: Color-coded stations for Compost, Recycling, and Landfill manned by youth scouts.",
                            "Accessibility (ADA): Ramped stage access, wide gravel/grass pathways, and accessible quiet tent.",
                            "Sponsorship Banners: Prominently feature local small businesses and credit union supporters.",
                        ],
                    },
                ),
                PersonalizedIdeaItem(
                    category="activities",
                    title="Giant Collaborative Chalk Mural & Multi-Cultural Showcase",
                    tagline="Hands-on creativity and inspiring performances from local artists",
                    description="Unite neighborhood talents with a 50-foot pavement chalk canvas, intergenerational chess tournaments, and 20-minute showcase sets from diverse cultural dance teams.",
                    badge="High Engagement",
                    details=[
                        "50-Foot Community Canvas: Guests of all ages contribute drawings on a giant outlined mural",
                        "Cultural Pavilion: Traditional dance demonstrations, drum circles, and acoustic folk music",
                        "Neighborhood Scavenger Hunt with local merchant coupons as prizes",
                    ],
                    flip_content={
                        "subtitle": "Activity Coordinator Playbook",
                        "items": [
                            "Mural Materials: 500-pack non-toxic washable sidewalk chalk and spray sealant for evening preservation.",
                            "Stage Scheduling: 15-minute buffer between performance groups for equipment transitions.",
                            "Safety & First Aid: Clearly marked shade canopy with ice water, sunblock, and certified volunteers.",
                        ],
                    },
                ),
            ]

        return ideas

    @classmethod
    def _build_curated_advice(cls, req: AIPromptRequest) -> str:
        """Constructs an encouraging executive summary based on the event parameters."""
        budget_str = f"{req.currency} {req.budget:,.2f}"
        return (
            f"Welcome to the master blueprint for '{req.title}'! "
            f"Designed for an anticipated guest count of {req.guest_count} attendees with an allocated budget of {budget_str}. "
            f"Our GenAI engine has balanced your budget allocations according to industry best practices, established both a strategic milestone countdown and an hour-by-hour day-of Run of Show, "
            f"and equipped you with prioritized vendor checklists. Explore your 3D interactive idea cards to uncover in-depth decor specifications, culinary pairings, and engagement ideas!"
        )

    @classmethod
    def answer_chat_query(cls, req: Any, event_context: Optional[Dict[str, Any]]) -> AIChatResponse:
        """Provides contextual, intelligent conversational planning advice."""
        if settings.gemini_api_key:
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=settings.gemini_api_key)
                context_str = json.dumps(event_context, default=str) if event_context else "No active event selected."
                sys_prompt = f"""
You are CelebraTech AI, an expert, enthusiastic, and highly organized celebration planning assistant.
You specialize in weddings, birthdays, and community events.
Always give concise, actionable, well-structured advice.
Event Context:
{context_str}
"""
                response = client.models.generate_content(
                    model=settings.gemini_model,
                    contents=f"{sys_prompt}\n\nUser Question: {req.message}",
                )
                if response and response.text:
                    return AIChatResponse(
                        reply=response.text.strip(),
                        suggested_actions=[
                            "Update budget with new estimate",
                            "Add milestone to timeline",
                            "Generate vendor email draft",
                        ],
                    )
            except Exception as e:
                logger.warning("Gemini chat error: %s; falling back to heuristic assistant", e)

        msg_lower = req.message.lower()

        if "cut" in msg_lower or "save" in msg_lower or "budget" in msg_lower or "cheaper" in msg_lower:
            reply = (
                "Here are 4 high-impact ways to trim costs without sacrificing guest experience:\n\n"
                "1. **Re-evaluate Beverage Service**: Switching from a top-shelf open bar to beer, wine, and 2 signature cocktails typically saves 25-35% on alcohol costs.\n"
                "2. **Dual-Use Florals**: Repurpose ceremony arch flowers and aisle arrangements as reception head table centerpieces.\n"
                "3. **Digital Stationery**: Switch Save-the-Dates and RSVP tracking to digital portals to eliminate paper, calligraphy, and postage fees (₹35,000-₹85,000 savings).\n"
                "4. **Photography Hours**: Booking 7-8 hours instead of 12 hours easily captures all core memories (first look through first dances) while saving substantial overtime charges."
            )
            actions = ["Rebalance budget items", "Export current budget to CSV", "Review catering breakdown"]

        elif "timeline" in msg_lower or "schedule" in msg_lower or "run of show" in msg_lower or "time" in msg_lower:
            reply = (
                "A successful Day-of Run of Show relies on the **15-Minute Buffer Rule**:\n\n"
                "- **Hair & Makeup**: Always finish 60 minutes before photographer arrival so the VIP party is relaxed and unhurried.\n"
                "- **First Look**: Schedule 2 hours prior to ceremony to complete 80% of family portraits before guests arrive.\n"
                "- **Speeches & Toasts**: Keep each speech strictly capped at 3 to 4 minutes during salad/dinner service.\n"
                "- **Teardown**: Assign a designated point person to pack gifts, cards, and personal decor into a getaway vehicle before open dancing starts."
            )
            actions = ["View Day-of Schedule", "Add custom timeline milestone", "Print run-of-show"]

        elif "vendor" in msg_lower or "caterer" in msg_lower or "photographer" in msg_lower or "dj" in msg_lower or "contract" in msg_lower:
            reply = (
                "Essential questions to ask every prospective vendor before signing:\n\n"
                "1. **Contingency Plan**: 'What is your backup protocol if the lead shooter or DJ falls ill on the event date?'\n"
                "2. **Overtime & Hidden Fees**: 'What are the exact hourly overtime rates, travel fees, or meal requirements for your staff?'\n"
                "3. **Insurance & Rider**: 'Do you carry comprehensive commercial liability insurance / ₹50,00,000+ coverage required by premier venues?'\n"
                "4. **Deliverables & Timeline**: 'What is the guaranteed turnaround time for edited photos, video teasers, or final receipts?'"
            )
            actions = ["Add new vendor to checklist", "Toggle vendor status", "Export vendor directory"]

        elif "speech" in msg_lower or "toast" in msg_lower or "words" in msg_lower or "invitation" in msg_lower:
            reply = (
                "**The Golden 3-Minute Toast Framework**:\n\n"
                "1. **The Hook (30 sec)**: Welcome everyone, express gratitude to the hosts, and introduce your connection to the guest of honor.\n"
                "2. **The Signature Story (90 sec)**: Pick ONE specific story that highlights their loyalty, generosity, or humor. Avoid inside jokes that exclude other guests!\n"
                "3. **The Transformation (30 sec)**: Mention how much better their life is now or how they impact the people around them.\n"
                "4. **The Toast (30 sec)**: 'Raise your glasses to health, joy, and memories in the making!'"
            )
            actions = ["Copy speech template", "Generate custom toast", "Add to timeline"]

        else:
            reply = (
                f"I'm here to help you perfect every detail of your celebration! "
                f"You can ask me to optimize your budget, create customized timeline schedules, write invitation or speech copy, "
                f"suggest creative themes, or draft vendor questions. What area would you like to explore next?"
            )
            actions = ["Recommend budget cuts", "Optimize timeline", "Explore theme ideas"]

        return AIChatResponse(
            reply=reply,
            suggested_actions=actions,
        )

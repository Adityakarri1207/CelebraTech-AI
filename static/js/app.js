/**
 * CelebraTech AI - Main Application Controller.
 * Coordinates UI states, tabs, modal forms, event transitions, and component rendering.
 */

const App = {
  events: [],
  currentEvent: null,
  currentTab: "ideas", // 'ideas' | 'budget' | 'timeline' | 'vendors' | 'guests' | 'moodboard' | 'invites' | 'assistant'
  activeIdeaFilter: "all",

  async init() {
    try {
      AIAssistantComponent.init();
      await this.loadEvents();
      this.setupEventListeners();
    } catch (err) {
      console.error("Initialization error:", err);
      this.showToast("Failed to initialize application data.", "error");
    }
  },

  async loadEvents(selectId = null) {
    this.events = await API.getEvents();
    this.populateEventSelector();

    if (this.events.length > 0) {
      const selected = selectId
        ? this.events.find((e) => e.id === selectId)
        : this.events[0];
      await this.selectEvent(selected ? selected.id : this.events[0].id);
    }
  },

  populateEventSelector() {
    const selector = document.getElementById("event-selector-dropdown");
    if (!selector) return;

    selector.innerHTML = this.events
      .map(
        (e) => `
        <option value="${e.id}" ${this.currentEvent?.id === e.id ? 'selected' : ''}>
          ${this.getEventEmoji(e.event_type)} ${e.title}
        </option>
      `
      )
      .join("");
  },

  async selectEvent(eventId) {
    try {
      const eventData = await API.getEvent(eventId);
      this.currentEvent = eventData;

      const selector = document.getElementById("event-selector-dropdown");
      if (selector) selector.value = eventId;

      this.renderHeader();
      this.updateTabCounters();
      await this.renderActiveTab();
    } catch (err) {
      this.showToast("Could not load event details.", "error");
    }
  },

  renderHeader() {
    if (!this.currentEvent) return;
    const e = this.currentEvent;

    const titleEl = document.getElementById("event-header-title");
    const metaEl = document.getElementById("event-header-meta");
    const typeBadge = document.getElementById("event-header-type");
    const countdownEl = document.getElementById("event-header-countdown");

    if (titleEl) titleEl.textContent = e.title;
    if (metaEl) {
      metaEl.textContent = `📍 ${e.location || 'Location TBD'}  •  👥 ${e.guest_count} Target Guests  •  📅 ${e.date || 'Date TBD'}`;
    }
    if (typeBadge) {
      typeBadge.textContent = `${this.getEventEmoji(e.event_type)} ${e.event_type.toUpperCase()}`;
    }
    if (countdownEl) {
      countdownEl.textContent = e.vibe || "Celebratory & Memorable";
    }
  },

  updateTabCounters() {
    if (!this.currentEvent) return;
    const e = this.currentEvent;

    const setBadge = (id, count) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    };

    setBadge("badge-count-ideas", e.ideas?.length || 0);
    setBadge("badge-count-timeline", e.timeline_items?.length || 0);
    setBadge("badge-count-vendors", e.vendors?.length || 0);
    setBadge("badge-count-guests", e.guests?.length || 0);
  },

  async renderActiveTab() {
    if (!this.currentEvent) return;

    if (this.currentTab === "ideas") {
      FlipCardsComponent.render(this.currentEvent.ideas || [], "ideas-grid-container", this.activeIdeaFilter);
    } else if (this.currentTab === "budget") {
      const summary = await API.getBudgetSummary(this.currentEvent.id);
      BudgetTrackerComponent.render(
        summary,
        this.currentEvent.budget_items || [],
        this.currentEvent.currency,
        this.currentEvent.event_type
      );
    } else if (this.currentTab === "timeline") {
      TimelineComponent.render(this.currentEvent.timeline_items || [], this.currentEvent.date);
    } else if (this.currentTab === "vendors") {
      VendorChecklistComponent.render(this.currentEvent.vendors || [], this.currentEvent.currency);
    } else if (this.currentTab === "guests") {
      GuestManagerComponent.render(this.currentEvent.guests || []);
    } else if (this.currentTab === "moodboard") {
      MoodboardPaletteComponent.render(
        this.currentEvent.color_palette || [],
        this.currentEvent.theme,
        this.currentEvent.vibe,
        this.currentEvent.event_type
      );
    } else if (this.currentTab === "invites") {
      InvitationStudioComponent.render(this.currentEvent);
    }
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    const tabs = ["ideas", "budget", "timeline", "vendors", "guests", "moodboard", "invites", "assistant"];
    tabs.forEach((t) => {
      const btn = document.getElementById(`nav-tab-${t}`);
      const section = document.getElementById(`tab-section-${t}`);
      if (btn) {
        if (t === tabName) {
          btn.className = "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 transition-all border border-pink-400/30";
        } else {
          btn.className = "flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-transparent";
        }
      }
      if (section) {
        section.classList.toggle("hidden", t !== tabName);
      }
    });

    this.renderActiveTab();
  },

  setIdeaFilter(filter) {
    this.activeIdeaFilter = filter;
    const filterButtons = document.querySelectorAll(".idea-filter-btn");
    filterButtons.forEach((btn) => {
      const f = btn.getAttribute("data-filter");
      if (f === filter) {
        btn.className = "idea-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-md border border-purple-400/30";
      } else {
        btn.className = "idea-filter-btn px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/5 border border-transparent";
      }
    });

    if (this.currentEvent) {
      FlipCardsComponent.render(this.currentEvent.ideas || [], "ideas-grid-container", filter);
    }
  },

  // Timeline operations
  async toggleTimeline(itemId) {
    if (!this.currentEvent) return;
    try {
      await API.toggleTimelineItem(this.currentEvent.id, itemId);
      window.celebrationConfetti.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
      await this.reloadCurrentEvent();
    } catch (err) {
      this.showToast("Failed to update milestone.", "error");
    }
  },

  async deleteTimeline(itemId) {
    if (!confirm("Are you sure you want to delete this schedule item?")) return;
    try {
      await API.deleteTimelineItem(this.currentEvent.id, itemId);
      await this.reloadCurrentEvent();
    } catch (err) {
      this.showToast("Failed to delete milestone.", "error");
    }
  },

  // Budget operations
  async deleteBudgetItem(itemId) {
    if (!confirm("Remove this budget item?")) return;
    try {
      await API.deleteBudgetItem(this.currentEvent.id, itemId);
      await this.reloadCurrentEvent();
    } catch (err) {
      this.showToast("Failed to delete expense.", "error");
    }
  },

  // Vendor operations
  async updateVendorStatus(vendorId, newStatus) {
    try {
      await API.updateVendorStatus(this.currentEvent.id, vendorId, newStatus);
      if (newStatus === "Contract Signed" || newStatus === "Fully Paid") {
        window.celebrationConfetti.burst(window.innerWidth / 2, window.innerHeight / 3, 50);
      }
      await this.reloadCurrentEvent();
    } catch (err) {
      this.showToast("Failed to update vendor status.", "error");
    }
  },

  async toggleVendorTask(vendorId, encodedTask) {
    const task = decodeURIComponent(encodedTask);
    try {
      await API.toggleVendorTask(this.currentEvent.id, vendorId, task);
      await this.reloadCurrentEvent();
    } catch (err) {
      this.showToast("Failed to toggle task.", "error");
    }
  },

  async deleteVendor(vendorId) {
    if (!confirm("Remove this vendor from directory?")) return;
    try {
      await API.deleteVendor(this.currentEvent.id, vendorId);
      await this.reloadCurrentEvent();
    } catch (err) {
      this.showToast("Failed to delete vendor.", "error");
    }
  },

  // Guest operations
  async updateGuestRSVP(guestId, status) {
    try {
      await API.updateGuestRSVP(this.currentEvent.id, guestId, status);
      if (status === "confirmed") {
        window.celebrationConfetti.burst(window.innerWidth / 2, window.innerHeight / 3, 30);
      }
      await this.reloadCurrentEvent();
    } catch (err) {
      this.showToast("Failed to update guest RSVP.", "error");
    }
  },

  async deleteGuest(guestId) {
    if (!confirm("Remove this guest from list?")) return;
    try {
      await API.deleteGuest(this.currentEvent.id, guestId);
      await this.reloadCurrentEvent();
    } catch (err) {
      this.showToast("Failed to delete guest.", "error");
    }
  },

  async reloadCurrentEvent() {
    if (this.currentEvent) {
      const updated = await API.getEvent(this.currentEvent.id);
      this.currentEvent = updated;
      this.updateTabCounters();
      await this.renderActiveTab();
    }
  },

  askAIForBudgetCuts() {
    this.switchTab("assistant");
    AIAssistantComponent.sendMessage("My event is currently over budget. What specific line items can I trim or negotiate?");
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  },

  async handleCreateEventSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const payload = {
      title: formData.get("title"),
      event_type: formData.get("event_type"),
      date: formData.get("date") || "",
      location: formData.get("location") || "",
      guest_count: parseInt(formData.get("guest_count") || "50", 10),
      total_budget: parseFloat(formData.get("total_budget") || "5000"),
      currency: formData.get("currency") || "USD",
      theme: formData.get("theme") || "",
      vibe: formData.get("vibe") || "",
      generate_ai_plan: formData.get("generate_ai_plan") === "on",
    };

    const submitBtn = form.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "✨ Generating AI Architecture...";
    submitBtn.disabled = true;

    try {
      const created = await API.createEvent(payload);
      window.celebrationConfetti.burst(window.innerWidth / 2, window.innerHeight / 2, 90);
      this.closeModal("modal-new-event");
      form.reset();
      await this.loadEvents(created.id);
      this.showToast("Celebration created with AI architecture!");
    } catch (err) {
      this.showToast(`Error creating event: ${err.message}`, "error");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  },

  async handleAddBudgetItemSubmit(e) {
    e.preventDefault();
    if (!this.currentEvent) return;

    const form = e.target;
    const formData = new FormData(form);

    const item = {
      name: formData.get("name"),
      category: formData.get("category"),
      estimated_cost: parseFloat(formData.get("estimated_cost") || "0"),
      actual_cost: parseFloat(formData.get("actual_cost") || "0"),
      paid: formData.get("paid") === "on",
      notes: formData.get("notes") || "",
    };

    try {
      await API.addBudgetItem(this.currentEvent.id, item);
      this.closeModal("modal-add-budget");
      form.reset();
      await this.reloadCurrentEvent();
      this.showToast("Budget line item added!");
    } catch (err) {
      this.showToast(`Error adding item: ${err.message}`, "error");
    }
  },

  async handleAddTimelineSubmit(e) {
    e.preventDefault();
    if (!this.currentEvent) return;

    const form = e.target;
    const formData = new FormData(form);

    const item = {
      title: formData.get("title"),
      time_or_offset: formData.get("time_or_offset"),
      phase: formData.get("phase"),
      description: formData.get("description") || "",
      owner: formData.get("owner") || "Event Host",
      completed: false,
    };

    try {
      await API.addTimelineItem(this.currentEvent.id, item);
      this.closeModal("modal-add-timeline");
      form.reset();
      await this.reloadCurrentEvent();
      this.showToast("Schedule item added!");
    } catch (err) {
      this.showToast(`Error adding schedule item: ${err.message}`, "error");
    }
  },

  async handleAddVendorSubmit(e) {
    e.preventDefault();
    if (!this.currentEvent) return;

    const form = e.target;
    const formData = new FormData(form);
    const tasksRaw = formData.get("tasks") || "";
    const tasks = tasksRaw
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const vendor = {
      name: formData.get("name"),
      category: formData.get("category"),
      quoted_price: parseFloat(formData.get("quoted_price") || "0"),
      status: formData.get("status") || "Researching",
      notes: formData.get("notes") || "",
      checklist_tasks: tasks.length > 0 ? tasks : ["Review quote", "Check references", "Sign contract"],
    };

    try {
      await API.addVendor(this.currentEvent.id, vendor);
      this.closeModal("modal-add-vendor");
      form.reset();
      await this.reloadCurrentEvent();
      this.showToast("Vendor added to directory!");
    } catch (err) {
      this.showToast(`Error adding vendor: ${err.message}`, "error");
    }
  },

  async handleAddGuestSubmit(e) {
    e.preventDefault();
    if (!this.currentEvent) return;

    const form = e.target;
    const formData = new FormData(form);

    const guest = {
      name: formData.get("name"),
      party_size: parseInt(formData.get("party_size") || "1", 10),
      rsvp_status: formData.get("rsvp_status") || "pending",
      dietary: formData.get("dietary") || "Standard",
      table_number: formData.get("table_number") ? parseInt(formData.get("table_number"), 10) : null,
      email_or_phone: formData.get("email_or_phone") || "",
      notes: formData.get("notes") || "",
    };

    try {
      await API.addGuest(this.currentEvent.id, guest);
      this.closeModal("modal-add-guest");
      form.reset();
      await this.reloadCurrentEvent();
      this.showToast("Guest added to roster!");
    } catch (err) {
      this.showToast(`Error adding guest: ${err.message}`, "error");
    }
  },

  applyStarterTemplate(type) {
    const templates = {
      wedding: {
        title: "Enchanted Garden Wedding Celebration",
        event_type: "wedding",
        date: "2026-10-18",
        location: "Rosewood Botanical Estate",
        guest_count: 125,
        total_budget: 30000,
        currency: "USD",
        theme: "Tuscan Sunset, Olive Foliage & Candlelit Romance",
        vibe: "Intimate, warm, emotional, and timelessly elegant",
      },
      birthday: {
        title: "Golden Milestone 50th Jubilee Gala",
        event_type: "birthday",
        date: "2026-11-22",
        location: "Grand Metropolitan Penthouse",
        guest_count: 65,
        total_budget: 7500,
        currency: "USD",
        theme: "Black Tie & Champagne Gold Glamour",
        vibe: "Sophisticated, festive, celebratory toast, live jazz",
      },
      community: {
        title: "Oakridge Neighborhood Summer Block Party",
        event_type: "community",
        date: "2026-07-04",
        location: "Oakridge Memorial Park & Meadows",
        guest_count: 400,
        total_budget: 14000,
        currency: "USD",
        theme: "Harmony, Local Artisans & Community Unity",
        vibe: "Family-friendly, lively acoustic music, delicious food trucks",
      },
    };

    const tpl = templates[type];
    if (!tpl) return;

    this.openModal("modal-new-event");
    const form = document.getElementById("form-create-event");
    if (form) {
      form.querySelector("[name='title']").value = tpl.title;
      form.querySelector("[name='event_type']").value = tpl.event_type;
      form.querySelector("[name='date']").value = tpl.date;
      form.querySelector("[name='location']").value = tpl.location;
      form.querySelector("[name='guest_count']").value = tpl.guest_count;
      form.querySelector("[name='total_budget']").value = tpl.total_budget;
      form.querySelector("[name='currency']").value = tpl.currency;
      form.querySelector("[name='theme']").value = tpl.theme;
      form.querySelector("[name='vibe']").value = tpl.vibe;
    }
  },

  getEventEmoji(type) {
    switch (type) {
      case "wedding":
        return "💍";
      case "birthday":
        return "🎂";
      case "community":
        return "🎪";
      case "anniversary":
        return "🥂";
      case "corporate":
        return "💼";
      default:
        return "🎉";
    }
  },

  showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 border transition-all duration-300 transform translate-y-4 opacity-0 ${
      type === "error"
        ? 'bg-rose-900/90 text-rose-200 border-rose-700'
        : 'bg-emerald-900/90 text-emerald-200 border-emerald-700'
    }`;
    toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '✓'}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove("translate-y-4", "opacity-0");
    }, 20);

    setTimeout(() => {
      toast.classList.add("translate-y-4", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  setupEventListeners() {
    const selector = document.getElementById("event-selector-dropdown");
    if (selector) {
      selector.addEventListener("change", (e) => this.selectEvent(e.target.value));
    }

    const createEventForm = document.getElementById("form-create-event");
    if (createEventForm) {
      createEventForm.addEventListener("submit", (e) => this.handleCreateEventSubmit(e));
    }

    const addBudgetForm = document.getElementById("form-add-budget");
    if (addBudgetForm) {
      addBudgetForm.addEventListener("submit", (e) => this.handleAddBudgetItemSubmit(e));
    }

    const addTimelineForm = document.getElementById("form-add-timeline");
    if (addTimelineForm) {
      addTimelineForm.addEventListener("submit", (e) => this.handleAddTimelineSubmit(e));
    }

    const addVendorForm = document.getElementById("form-add-vendor");
    if (addVendorForm) {
      addVendorForm.addEventListener("submit", (e) => this.handleAddVendorSubmit(e));
    }

    const addGuestForm = document.getElementById("form-add-guest");
    if (addGuestForm) {
      addGuestForm.addEventListener("submit", (e) => this.handleAddGuestSubmit(e));
    }

    const chatBtn = document.getElementById("btn-chat-send");
    const chatInput = document.getElementById("chat-input-field");
    if (chatBtn) {
      chatBtn.addEventListener("click", () => AIAssistantComponent.sendMessage());
    }
    if (chatInput) {
      chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          AIAssistantComponent.sendMessage();
        }
      });
    }
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());

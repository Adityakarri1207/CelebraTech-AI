/**
 * Clean, robust API client for CelebraTech AI Event Planner.
 * Handles network requests, error responses, and data formatting.
 */

const API = {
  baseUrl: "",

  async request(endpoint, options = {}) {
    const defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const config = {
      ...options,
      headers: { ...defaultHeaders, ...(options.headers || {}) },
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      if (!response.ok) {
        let errMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData.detail) errMessage = errData.detail;
        } catch (_) {}
        throw new Error(errMessage);
      }
      if (response.status === 204) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error(`API Error on [${options.method || "GET"}] ${endpoint}:`, error);
      throw error;
    }
  },

  // Events CRUD
  getEvents() {
    return this.request("/api/events");
  },

  getEvent(id) {
    return this.request(`/api/events/${id}`);
  },

  createEvent(payload) {
    return this.request("/api/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateEvent(id, payload) {
    return this.request(`/api/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteEvent(id) {
    return this.request(`/api/events/${id}`, {
      method: "DELETE",
    });
  },

  // Budget
  getBudgetSummary(eventId) {
    return this.request(`/api/events/${eventId}/budget-summary`);
  },

  addBudgetItem(eventId, item) {
    return this.request(`/api/events/${eventId}/budget-items`, {
      method: "POST",
      body: JSON.stringify(item),
    });
  },

  updateBudgetItem(eventId, itemId, item) {
    return this.request(`/api/events/${eventId}/budget-items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(item),
    });
  },

  recordBudgetPayment(eventId, itemId, payload) {
    return this.request(`/api/events/${eventId}/budget-items/${itemId}/record-payment`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  toggleBudgetItemPaid(eventId, itemId, payload = null) {
    return this.request(`/api/events/${eventId}/budget-items/${itemId}/toggle-paid`, {
      method: "PATCH",
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
  },

  deleteBudgetItem(eventId, itemId) {
    return this.request(`/api/events/${eventId}/budget-items/${itemId}`, {
      method: "DELETE",
    });
  },

  // Timeline
  addTimelineItem(eventId, item) {
    return this.request(`/api/events/${eventId}/timeline-items`, {
      method: "POST",
      body: JSON.stringify(item),
    });
  },

  toggleTimelineItem(eventId, itemId) {
    return this.request(`/api/events/${eventId}/timeline-items/${itemId}/toggle`, {
      method: "PATCH",
    });
  },

  deleteTimelineItem(eventId, itemId) {
    return this.request(`/api/events/${eventId}/timeline-items/${itemId}`, {
      method: "DELETE",
    });
  },

  // Vendors
  addVendor(eventId, vendor) {
    return this.request(`/api/events/${eventId}/vendors`, {
      method: "POST",
      body: JSON.stringify(vendor),
    });
  },

  updateVendorStatus(eventId, vendorId, status) {
    return this.request(`/api/events/${eventId}/vendors/${vendorId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  settleVendorPayment(eventId, vendorId, payload) {
    return this.request(`/api/events/${eventId}/vendors/${vendorId}/settle`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  toggleVendorTask(eventId, vendorId, task) {
    return this.request(`/api/events/${eventId}/vendors/${vendorId}/task`, {
      method: "PATCH",
      body: JSON.stringify({ task }),
    });
  },

  deleteVendor(eventId, vendorId) {
    return this.request(`/api/events/${eventId}/vendors/${vendorId}`, {
      method: "DELETE",
    });
  },

  // Guests
  addGuest(eventId, guest) {
    return this.request(`/api/events/${eventId}/guests`, {
      method: "POST",
      body: JSON.stringify(guest),
    });
  },

  updateGuestRSVP(eventId, guestId, rsvp_status) {
    return this.request(`/api/events/${eventId}/guests/${guestId}/rsvp`, {
      method: "PATCH",
      body: JSON.stringify({ rsvp_status }),
    });
  },

  deleteGuest(eventId, guestId) {
    return this.request(`/api/events/${eventId}/guests/${guestId}`, {
      method: "DELETE",
    });
  },

  // AI Assistant
  generatePlan(payload) {
    return this.request("/api/ai/generate-plan", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  chatAssistant(payload) {
    return this.request("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Export triggers
  downloadExport(eventId, type) {
    const endpoints = {
      markdown: `/api/events/${eventId}/export/markdown`,
      budget: `/api/events/${eventId}/export/budget-csv`,
      vendors: `/api/events/${eventId}/export/vendors-csv`,
      guests: `/api/events/${eventId}/export/guests-csv`,
    };
    window.open(endpoints[type] || endpoints.markdown, "_blank");
  },
};

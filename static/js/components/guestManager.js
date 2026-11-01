/**
 * Guest List & RSVP Manager Component for CelebraTech AI.
 * Handles attendance tracking, dietary summaries, table seating, and RSVP analytics.
 */

const GuestManagerComponent = {
  currentFilter: "all", // 'all' | 'confirmed' | 'pending' | 'declined'

  render(guests) {
    this.renderStats(guests || []);
    this.renderGuestsTable(guests || []);
  },

  renderStats(guests) {
    const totalHeadcount = guests.reduce((sum, g) => sum + (g.party_size || 1), 0);
    const confirmedCount = guests
      .filter((g) => g.rsvp_status === "confirmed")
      .reduce((sum, g) => sum + (g.party_size || 1), 0);
    const pendingCount = guests
      .filter((g) => g.rsvp_status === "pending")
      .reduce((sum, g) => sum + (g.party_size || 1), 0);
    const declinedCount = guests
      .filter((g) => g.rsvp_status === "declined")
      .reduce((sum, g) => sum + (g.party_size || 1), 0);

    const confirmedPct = totalHeadcount > 0 ? Math.round((confirmedCount / totalHeadcount) * 100) : 0;

    const elConfirmed = document.getElementById("guest-kpi-confirmed");
    const elPending = document.getElementById("guest-kpi-pending");
    const elDeclined = document.getElementById("guest-kpi-declined");
    const elTotal = document.getElementById("guest-kpi-total");
    const progressBar = document.getElementById("guest-progress-bar");
    const progressLabel = document.getElementById("guest-progress-label");

    if (elConfirmed) elConfirmed.textContent = `${confirmedCount} Attendees`;
    if (elPending) elPending.textContent = `${pendingCount} Awaiting`;
    if (elDeclined) elDeclined.textContent = `${declinedCount} Regrets`;
    if (elTotal) elTotal.textContent = `${totalHeadcount} Total Invited`;

    if (progressBar) progressBar.style.width = `${confirmedPct}%`;
    if (progressLabel) progressLabel.textContent = `${confirmedPct}% Attendance Confirmed`;

    // Dietary summary
    const dietaryMap = {};
    guests.forEach((g) => {
      const diet = g.dietary || "Standard";
      dietaryMap[diet] = (dietaryMap[diet] || 0) + (g.party_size || 1);
    });

    const dietaryContainer = document.getElementById("guest-dietary-tags");
    if (dietaryContainer) {
      dietaryContainer.innerHTML = Object.entries(dietaryMap)
        .map(
          ([diet, count]) => `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
            <span class="w-2 h-2 rounded-full ${diet.toLowerCase().includes('vegan') || diet.toLowerCase().includes('gluten') ? 'bg-emerald-400' : 'bg-purple-400'}"></span>
            ${diet}: <strong class="text-white">${count}</strong>
          </span>
        `
        )
        .join("");
    }
  },

  setFilter(filter, guests) {
    this.currentFilter = filter;
    const filterBtns = document.querySelectorAll(".guest-filter-btn");
    filterBtns.forEach((btn) => {
      const f = btn.getAttribute("data-filter");
      if (f === filter) {
        btn.className = "guest-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white shadow-md";
      } else {
        btn.className = "guest-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-white/5";
      }
    });
    this.renderGuestsTable(guests);
  },

  renderGuestsTable(guests) {
    const tbody = document.getElementById("guests-table-body");
    if (!tbody) return;

    let filtered = guests || [];
    if (this.currentFilter !== "all") {
      filtered = filtered.filter((g) => g.rsvp_status === this.currentFilter);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-xs text-slate-500">No guests match this filter. Click "+ Add Guest" to invite attendees.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((g) => {
        const rsvpBadges = {
          confirmed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          declined: "bg-rose-500/20 text-rose-300 border-rose-500/30",
          pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        };

        return `
          <tr class="border-b border-white/5 hover:bg-white/[0.02] transition-colors text-xs">
            <td class="py-3 px-3 font-semibold text-slate-100 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-[10px]">
                ${g.name.charAt(0)}
              </span>
              <span>${g.name}</span>
            </td>
            <td class="py-3 px-3 text-slate-300 font-bold">Party of ${g.party_size}</td>
            <td class="py-3 px-3">
              <select onchange="App.updateGuestRSVP('${g.id}', this.value)" class="text-xs font-semibold px-2.5 py-1 rounded-lg border outline-none cursor-pointer ${rsvpBadges[g.rsvp_status] || rsvpBadges.pending} bg-slate-900">
                <option value="confirmed" ${g.rsvp_status === 'confirmed' ? 'selected' : ''}>Confirmed ✓</option>
                <option value="pending" ${g.rsvp_status === 'pending' ? 'selected' : ''}>Pending ⏳</option>
                <option value="declined" ${g.rsvp_status === 'declined' ? 'selected' : ''}>Declined ✕</option>
              </select>
            </td>
            <td class="py-3 px-3">
              <span class="text-[11px] px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 font-medium">
                ${g.dietary || 'Standard'}
              </span>
            </td>
            <td class="py-3 px-3 text-slate-300">
              ${g.table_number ? `Table ${g.table_number}` : '<span class="text-slate-600 italic">Unassigned</span>'}
            </td>
            <td class="py-3 px-3 text-slate-400 text-[11px] truncate max-w-[140px]">
              ${g.email_or_phone || '—'}
            </td>
            <td class="py-3 px-3 text-right">
              <button type="button" onclick="App.deleteGuest('${g.id}')" class="text-slate-500 hover:text-rose-400 p-1 text-xs transition-colors" title="Remove guest">
                🗑️
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  },
};

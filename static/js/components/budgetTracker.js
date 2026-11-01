/**
 * Interactive Budget & Expense Tracker Component for CelebraTech AI.
 * Handles KPI stats, category distributions, over-budget warnings, line items,
 * and an interactive "What-If" Budget Rebalance Slider Simulator.
 */

const BudgetTrackerComponent = {
  simulatedBudget: 0,

  render(summary, budgetItems, currency = "USD", eventType = "wedding") {
    this.simulatedBudget = summary.total_budget;
    this.renderKPIs(summary, currency);
    this.renderAlertsAndRecommendations(summary, currency);
    this.renderCategoryBreakdown(summary.category_breakdown, currency);
    this.renderSimulator(summary.total_budget, currency, eventType);
    this.renderExpenseTable(budgetItems, currency);
  },

  renderKPIs(summary, currency) {
    const formatMoney = (val) => `${currency} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const totalEl = document.getElementById("kpi-total-budget");
    const estimatedEl = document.getElementById("kpi-total-estimated");
    const actualEl = document.getElementById("kpi-total-actual");
    const remainingEl = document.getElementById("kpi-remaining-budget");
    const progressFill = document.getElementById("budget-progress-fill");
    const progressLabel = document.getElementById("budget-progress-label");

    if (totalEl) totalEl.textContent = formatMoney(summary.total_budget);
    if (estimatedEl) estimatedEl.textContent = formatMoney(summary.total_estimated);
    if (actualEl) actualEl.textContent = formatMoney(summary.total_actual);
    if (remainingEl) {
      remainingEl.textContent = formatMoney(summary.remaining_budget);
      remainingEl.className = summary.remaining_budget < 0
        ? "text-2xl font-black text-rose-400"
        : "text-2xl font-black text-emerald-400";
    }

    if (progressFill && progressLabel) {
      const pct = Math.min(100, Math.max(0, summary.percentage_spent));
      progressFill.style.width = `${pct}%`;
      progressLabel.textContent = `${summary.percentage_spent}% Spent`;

      if (summary.percentage_spent > 100) {
        progressFill.className = "h-full bg-gradient-to-r from-amber-500 to-rose-600 rounded-full transition-all duration-700";
      } else if (summary.percentage_spent > 85) {
        progressFill.className = "h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-700";
      } else {
        progressFill.className = "h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-700";
      }
    }
  },

  renderAlertsAndRecommendations(summary, currency) {
    const alertContainer = document.getElementById("budget-alerts-container");
    if (!alertContainer) return;

    let html = "";
    if (summary.is_over_budget) {
      html += `
        <div class="banner-overbudget p-4 rounded-2xl flex items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-3">
            <span class="text-3xl">⚠️</span>
            <div>
              <h4 class="font-bold text-rose-300 text-sm">Over-Budget Alert</h4>
              <p class="text-xs text-rose-200/90">
                Current expenses exceed target by <strong>${currency} ${summary.over_budget_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.
                Review recommendations below to rebalance.
              </p>
            </div>
          </div>
          <button type="button" onclick="App.askAIForBudgetCuts()" class="px-3.5 py-2 text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 border border-rose-400/40 rounded-xl transition-colors whitespace-nowrap">
            🤖 Ask AI to Cut Costs
          </button>
        </div>
      `;
    }

    if (summary.cost_saving_recommendations?.length > 0) {
      const recsHtml = summary.cost_saving_recommendations
        .map((r) => `<li class="flex items-start gap-2 text-xs text-slate-300"><span class="text-amber-400 font-bold">💡</span><span>${r}</span></li>`)
        .join("");

      html += `
        <div class="glass-panel p-5 rounded-2xl mb-6 border-l-4 border-l-amber-500">
          <h4 class="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span>✨ GenAI Financial Optimization Advice</span>
          </h4>
          <ul class="space-y-1.5">${recsHtml}</ul>
        </div>
      `;
    }

    alertContainer.innerHTML = html;
  },

  renderCategoryBreakdown(categories, currency) {
    const container = document.getElementById("category-breakdown-container");
    if (!container) return;

    const entries = Object.entries(categories || {});
    if (entries.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400">No categories allocated.</p>`;
      return;
    }

    container.innerHTML = entries
      .map(([catName, data]) => {
        const est = data.estimated || 0;
        const act = data.actual || 0;
        const pct = data.percentage_of_total || 0;
        return `
          <div class="p-3.5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-slate-200 truncate pr-2">${catName}</span>
              <span class="text-xs font-semibold text-purple-300">${pct}%</span>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
              <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" style="width: ${Math.min(100, pct)}%"></div>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-400">
              <span>Est: ${currency} ${est.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
              <span>Paid: <strong class="text-slate-300">${currency} ${act.toLocaleString(undefined, { minimumFractionDigits: 0 })}</strong></span>
            </div>
          </div>
        `;
      })
      .join("");
  },

  renderSimulator(currentBudget, currency, eventType) {
    const container = document.getElementById("budget-simulator-container");
    if (!container) return;

    const ratios = eventType === "wedding"
      ? { "Venue & Rentals": 0.35, "Catering & Bar": 0.30, "Photography": 0.12, "Decor & Floral": 0.08, "Music/DJ": 0.07, "Contingency": 0.08 }
      : { "Venue & Staging": 0.30, "Food & Drinks": 0.35, "Entertainment": 0.15, "Decor/Backdrop": 0.10, "Misc/Favors": 0.10 };

    container.innerHTML = `
      <div class="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">Interactive Simulator</span>
            <h3 class="text-sm font-bold text-white">What-If Budget Rebalance Calculator</h3>
          </div>
          <div class="text-right">
            <span id="simulator-amount-display" class="text-xl font-black text-amber-300">${currency} ${Number(currentBudget).toLocaleString()}</span>
            <span class="text-[11px] text-slate-400 block">Simulated Budget</span>
          </div>
        </div>

        <div>
          <input type="range" id="simulator-slider" min="1000" max="100000" step="500" value="${currentBudget}" oninput="BudgetTrackerComponent.updateSimulation(this.value, '${currency}')" class="w-full accent-purple-500 cursor-pointer">
          <div class="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>${currency} 1,000</span>
            <span>${currency} 50,000</span>
            <span>${currency} 100,000</span>
          </div>
        </div>

        <div id="simulator-allocations-preview" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
          <!-- Populated by updateSimulation -->
        </div>

        <div class="flex justify-end pt-2">
          <button type="button" onclick="BudgetTrackerComponent.applySimulatedBudget()" class="px-4 py-2 text-xs font-bold bg-purple-600/30 hover:bg-purple-600 text-purple-200 border border-purple-400/30 rounded-xl transition-all">
            ✓ Apply Simulated Target Budget
          </button>
        </div>
      </div>
    `;

    this.updateSimulation(currentBudget, currency);
  },

  updateSimulation(newVal, currency) {
    this.simulatedBudget = parseFloat(newVal);
    const display = document.getElementById("simulator-amount-display");
    if (display) display.textContent = `${currency} ${Number(newVal).toLocaleString()}`;

    const preview = document.getElementById("simulator-allocations-preview");
    if (!preview) return;

    const allocations = [
      { name: "Venue & Hall", pct: 0.35 },
      { name: "Catering & Bar", pct: 0.30 },
      { name: "Photography", pct: 0.12 },
      { name: "Decor/Floral", pct: 0.08 },
      { name: "Music / DJ", pct: 0.07 },
      { name: "Buffer Fund", pct: 0.08 },
    ];

    preview.innerHTML = allocations
      .map((a) => {
        const val = this.simulatedBudget * a.pct;
        return `
          <div class="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
            <span class="text-[10px] text-slate-400 block truncate">${a.name}</span>
            <span class="text-xs font-bold text-slate-100">${currency} ${Math.round(val).toLocaleString()}</span>
            <span class="text-[9px] text-purple-300 font-semibold block">${Math.round(a.pct * 100)}%</span>
          </div>
        `;
      })
      .join("");
  },

  async applySimulatedBudget() {
    if (!App.currentEvent) return;
    try {
      await API.updateEvent(App.currentEvent.id, { total_budget: this.simulatedBudget });
      App.showToast(`Target budget updated to ${this.simulatedBudget.toLocaleString()}!`);
      await App.reloadCurrentEvent();
    } catch (err) {
      App.showToast("Failed to update target budget.", "error");
    }
  },

  renderExpenseTable(items, currency) {
    const tbody = document.getElementById("expense-table-body");
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-slate-500">No budget items recorded. Click "+ Add Line Item" above.</td></tr>`;
      return;
    }

    tbody.innerHTML = items
      .map((item) => `
        <tr class="border-b border-white/5 hover:bg-white/[0.02] transition-colors text-xs">
          <td class="py-3 px-3 font-semibold text-slate-200">${item.name}</td>
          <td class="py-3 px-3 text-slate-400">${item.category}</td>
          <td class="py-3 px-3 text-slate-300">${currency} ${Number(item.estimated_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td class="py-3 px-3 font-semibold text-amber-300">${currency} ${Number(item.actual_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td class="py-3 px-3">
            <span class="px-2 py-0.5 rounded text-[11px] font-medium ${item.paid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700/50 text-slate-400'}">
              ${item.paid ? 'Paid ✓' : 'Pending'}
            </span>
          </td>
          <td class="py-3 px-3 text-right">
            <button type="button" onclick="App.deleteBudgetItem('${item.id}')" class="text-slate-500 hover:text-rose-400 p-1 transition-colors" title="Delete item">
              🗑️
            </button>
          </td>
        </tr>
      `)
      .join("");
  },
};

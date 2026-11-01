/**
 * Interactive Timeline & Run-of-Show Component for CelebraTech AI.
 * Handles planning milestones, hour-by-hour day-of schedules, completion states,
 * and an interactive Live Countdown Clock.
 */

const TimelineComponent = {
  activePhase: "planning", // 'planning' | 'day_of'
  countdownInterval: null,

  render(items, eventDate = null) {
    this.renderTabs();
    this.renderCountdown(eventDate);
    this.renderTimelineItems(items);
  },

  renderTabs() {
    const tabPlanning = document.getElementById("timeline-tab-planning");
    const tabDayOf = document.getElementById("timeline-tab-dayof");

    if (tabPlanning && tabDayOf) {
      if (this.activePhase === "planning") {
        tabPlanning.className = "px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white shadow-lg transition-all";
        tabDayOf.className = "px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-slate-200 transition-all";
      } else {
        tabDayOf.className = "px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white shadow-lg transition-all";
        tabPlanning.className = "px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-slate-200 transition-all";
      }
    }
  },

  setPhase(phase, items) {
    this.activePhase = phase;
    this.renderTabs();
    this.renderTimelineItems(items);
  },

  renderCountdown(eventDate) {
    const container = document.getElementById("timeline-countdown-container");
    if (!container) return;

    if (!eventDate) {
      container.innerHTML = "";
      return;
    }

    if (this.countdownInterval) clearInterval(this.countdownInterval);

    const targetTime = new Date(eventDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        container.innerHTML = `
          <div class="p-4 rounded-2xl bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 border border-emerald-500/40 text-center mb-6">
            <span class="text-sm font-bold text-emerald-300">🎉 Today is the Celebration Day! Enjoy every magical moment!</span>
          </div>
        `;
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      container.innerHTML = `
        <div class="glass-panel p-5 rounded-3xl border border-white/10 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="text-3xl">⏳</span>
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">Countdown to Celebration</span>
              <h4 class="text-sm font-bold text-white">Event Date: ${new Date(eventDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
            </div>
          </div>
          <div class="flex items-center gap-2 text-center">
            <div class="px-3.5 py-2 rounded-2xl bg-black/40 border border-white/10 min-w-[58px]">
              <span class="text-lg font-black text-amber-300 block">${days}</span>
              <span class="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Days</span>
            </div>
            <div class="px-3.5 py-2 rounded-2xl bg-black/40 border border-white/10 min-w-[58px]">
              <span class="text-lg font-black text-slate-200 block">${hours}</span>
              <span class="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Hours</span>
            </div>
            <div class="px-3.5 py-2 rounded-2xl bg-black/40 border border-white/10 min-w-[58px]">
              <span class="text-lg font-black text-slate-200 block">${minutes}</span>
              <span class="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Mins</span>
            </div>
            <div class="px-3.5 py-2 rounded-2xl bg-black/40 border border-white/10 min-w-[58px]">
              <span class="text-lg font-black text-pink-400 block">${seconds}</span>
              <span class="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Secs</span>
            </div>
          </div>
        </div>
      `;
    };

    updateTimer();
    this.countdownInterval = setInterval(updateTimer, 1000);
  },

  renderTimelineItems(items) {
    const container = document.getElementById("timeline-items-container");
    if (!container) return;

    const filtered = (items || []).filter((i) => i.phase === this.activePhase);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-500 text-sm">
          <p>No schedule items registered for this phase.</p>
        </div>
      `;
      return;
    }

    filtered.sort((a, b) => (a.order || 0) - (b.order || 0));

    container.innerHTML = filtered
      .map((item, index) => {
        const isCompleted = item.completed;
        const icon = this.activePhase === "day_of" ? "⏰" : "📅";

        return `
          <div class="relative pl-8 pb-6 last:pb-2 group">
            <div class="absolute left-3.5 top-3.5 bottom-0 w-0.5 bg-slate-800 group-last:hidden"></div>

            <button type="button" onclick="App.toggleTimeline('${item.id}')" class="absolute left-1 top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
              isCompleted
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                : 'bg-slate-800 border border-slate-600 text-slate-400 hover:border-purple-400 hover:text-purple-300'
            }" title="Click to mark complete">
              ${isCompleted ? '✓' : index + 1}
            </button>

            <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all card-hover-lift">
              <div class="flex items-center justify-between gap-3 mb-1.5">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    ${icon} ${item.time_or_offset}
                  </span>
                  <span class="text-xs text-slate-400">Lead: <strong class="text-slate-300">${item.owner || 'Host'}</strong></span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-medium ${isCompleted ? 'text-emerald-400' : 'text-slate-500'}">
                    ${isCompleted ? 'Completed ✓' : 'Pending'}
                  </span>
                  <button type="button" onclick="App.deleteTimeline('${item.id}')" class="text-slate-600 hover:text-rose-400 text-xs p-1 transition-colors" title="Delete milestone">
                    🗑️
                  </button>
                </div>
              </div>

              <h4 class="text-sm font-bold text-slate-100 ${isCompleted ? 'line-through text-slate-400' : ''}">
                ${item.title}
              </h4>

              ${item.description ? `<p class="text-xs text-slate-400 mt-1 leading-relaxed">${item.description}</p>` : ''}
            </div>
          </div>
        `;
      })
      .join("");
  },
};

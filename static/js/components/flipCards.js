/**
 * 3D Flip Card Component for CelebraTech AI Event Planner.
 * Renders interactive cards that flip on clicking ANYWHERE on the card,
 * with keyboard accessibility (Enter/Space), synthesized audio chimes,
 * and rich back-side blueprints.
 */

const FlipCardsComponent = {
  audioContext: null,

  playFlipChime() {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }
      if (this.audioContext) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, this.audioContext.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.04, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.15);
      }
    } catch (_) {}
  },

  render(ideas, containerId = "ideas-grid-container", activeFilter = "all") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const filtered = activeFilter === "all"
      ? ideas
      : ideas.filter((i) => i.category.toLowerCase() === activeFilter.toLowerCase());

    if (!filtered || filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-400">
          <div class="text-4xl mb-3">✨</div>
          <p class="text-lg font-medium text-slate-300">No concepts found in this category.</p>
          <p class="text-xs text-slate-500 mt-1">Select "All Concepts" or click "✨ Ask AI for more ideas".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map((idea, index) => {
        const badgeColorClass = this.getBadgeClass(idea.category);
        const icon = this.getCategoryIcon(idea.category);

        const detailsList = (idea.details || [])
          .map(
            (d) => `
            <li class="flex items-start gap-2 text-xs text-slate-300">
              <span class="text-amber-400 mt-0.5">•</span>
              <span>${d}</span>
            </li>`
          )
          .join("");

        const flipBullets = (idea.flip_content?.items || idea.flip_content?.bullets || [])
          .map(
            (item) => `
            <li class="flex items-start gap-2 text-xs text-slate-300 leading-relaxed bg-white/5 p-2.5 rounded-xl border border-white/5">
              <span class="text-purple-400 mt-0.5 font-bold">✓</span>
              <span>${item}</span>
            </li>`
          )
          .join("");

        return `
          <div class="flip-card-container group" tabindex="0" role="button" aria-expanded="false" data-card-index="${index}">
            <div class="flip-card-inner">
              
              <!-- FRONT OF 3D CARD -->
              <div class="flip-card-front">
                <div class="flex items-center justify-between gap-2 mb-3">
                  <span class="text-xs font-semibold px-3 py-1 rounded-full ${badgeColorClass}">
                    ${icon} ${idea.badge || idea.category.toUpperCase()}
                  </span>
                  <span class="flip-hint-badge">
                    <span class="flip-icon">↻</span> Flip Card
                  </span>
                </div>

                <h3 class="text-lg font-extrabold text-white group-hover:text-amber-300 transition-colors line-clamp-2 mb-1">
                  ${idea.title}
                </h3>
                <p class="text-xs font-medium text-amber-300/90 mb-3 italic">
                  "${idea.tagline || 'Curated celebration aesthetic'}"
                </p>

                <p class="text-xs text-slate-300 mb-4 line-clamp-3 leading-relaxed">
                  ${idea.description}
                </p>

                <div class="mt-auto border-t border-white/10 pt-3">
                  <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Key Highlights</h4>
                  <ul class="space-y-1.5">
                    ${detailsList}
                  </ul>
                </div>

                <div class="mt-4 pt-2 text-center text-slate-400 text-[11px] font-medium flex items-center justify-center gap-1.5 bg-white/[0.02] py-1.5 rounded-xl border border-white/5">
                  <span>💡 Click anywhere on this card to flip details</span>
                </div>
              </div>

              <!-- BACK OF 3D CARD -->
              <div class="flip-card-back">
                <div class="flex items-center justify-between gap-2 mb-3 border-b border-purple-500/20 pb-2">
                  <span class="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                    🔍 ${idea.flip_content?.subtitle || "Execution Blueprint"}
                  </span>
                  <span class="flip-hint-badge">
                    <span class="flip-icon">↻</span> Flip Back
                  </span>
                </div>

                <h4 class="text-sm font-extrabold text-white mb-2">
                  ${idea.title}
                </h4>

                <div class="flex-1 overflow-y-auto pr-1 space-y-2 mb-3">
                  ${flipBullets || '<p class="text-xs text-slate-400">Detailed guidelines and vendor specifications.</p>'}
                </div>

                <div class="mt-auto pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span class="text-slate-400">Category: <strong class="text-slate-200 capitalize">${idea.category}</strong></span>
                  <button type="button" class="px-3 py-1 text-xs font-semibold bg-purple-600/40 hover:bg-purple-600 text-purple-200 rounded-xl border border-purple-400/30 transition-colors shadow-sm" onclick="event.stopPropagation(); window.copyIdeaText('${encodeURIComponent(idea.title + ': ' + idea.description)}');">
                    📋 Copy Text
                  </button>
                </div>
              </div>

            </div>
          </div>
        `;
      })
      .join("");

    this.attachFlipEventListeners(container);
  },

  attachFlipEventListeners(container) {
    const cards = container.querySelectorAll(".flip-card-container");
    cards.forEach((card) => {
      const toggleFlip = () => {
        const isFlipped = card.classList.toggle("is-flipped");
        card.setAttribute("aria-expanded", isFlipped ? "true" : "false");
        FlipCardsComponent.playFlipChime();
      };

      card.addEventListener("click", (e) => {
        if (e.target.closest("button") || e.target.closest("a")) return;
        toggleFlip();
      });

      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleFlip();
        }
      });
    });
  },

  getBadgeClass(category) {
    switch (category?.toLowerCase()) {
      case "theme":
        return "badge-glow-rose";
      case "menu":
        return "badge-glow-gold";
      case "activities":
        return "badge-glow-emerald";
      case "playlist":
        return "badge-glow-cyan";
      default:
        return "badge-glow-rose";
    }
  },

  getCategoryIcon(category) {
    switch (category?.toLowerCase()) {
      case "theme":
        return "🎨";
      case "menu":
        return "🍽️";
      case "activities":
        return "🎲";
      case "playlist":
        return "🎵";
      case "invitation_copy":
        return "💌";
      default:
        return "💡";
    }
  },
};

window.copyIdeaText = (encoded) => {
  const text = decodeURIComponent(encoded);
  navigator.clipboard.writeText(text).then(() => {
    App.showToast("Copied idea details to clipboard!");
  });
};

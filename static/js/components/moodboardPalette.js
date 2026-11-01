/**
 * Theme Moodboard & Color Palette Component for CelebraTech AI.
 * Renders hex swatch chips, theme aesthetics, lighting specs, and typography pairings.
 */

const MoodboardPaletteComponent = {
  render(palette, theme, vibe, eventType) {
    this.renderSwatches(palette || []);
    this.renderAestheticSpecs(theme, vibe, eventType);
  },

  renderSwatches(palette) {
    const container = document.getElementById("palette-swatches-container");
    if (!container) return;

    if (!palette || palette.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-500">No color palette configured.</p>`;
      return;
    }

    container.innerHTML = palette
      .map(
        (color) => `
        <div class="glass-panel p-4 rounded-2xl flex flex-col items-center text-center group cursor-pointer card-hover-lift" onclick="MoodboardPaletteComponent.copyHex('${color.hex_code}')" title="Click to copy hex code">
          <div class="w-16 h-16 rounded-2xl shadow-xl mb-3 border border-white/20 transform group-hover:scale-105 transition-transform" style="background-color: ${color.hex_code};"></div>
          <span class="text-xs font-bold text-slate-100 mb-0.5">${color.name}</span>
          <span class="text-[10px] uppercase font-semibold text-purple-300 tracking-wider mb-2">${color.role || 'Accent'}</span>
          <div class="flex items-center gap-1 text-[11px] font-mono bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 text-amber-300 group-hover:border-amber-400 transition-colors">
            <span>${color.hex_code}</span>
            <span class="text-xs opacity-60">📋</span>
          </div>
        </div>
      `
      )
      .join("");
  },

  renderAestheticSpecs(theme, vibe, eventType) {
    const container = document.getElementById("theme-specs-container");
    if (!container) return;

    const specs = this.getSpecsByEventType(eventType, theme, vibe);

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div class="flex items-center gap-2 mb-2 text-amber-300 text-sm font-bold">
            <span>✨</span> Theme & Ambiance
          </div>
          <h4 class="text-sm font-bold text-white mb-1">${theme || 'Signature Celebration Aesthetic'}</h4>
          <p class="text-xs text-slate-400 mb-3">${vibe || 'Warm, memorable and celebratory'}</p>
          <ul class="space-y-1.5 text-xs text-slate-300">
            ${specs.ambiance.map((item) => `<li class="flex items-start gap-1.5"><span class="text-amber-400">•</span><span>${item}</span></li>`).join("")}
          </ul>
        </div>

        <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div class="flex items-center gap-2 mb-2 text-pink-300 text-sm font-bold">
            <span>💡</span> Lighting Architecture
          </div>
          <h4 class="text-sm font-bold text-white mb-1">Atmospheric Illumination</h4>
          <p class="text-xs text-slate-400 mb-3">Creating depth and photo-worthy glow</p>
          <ul class="space-y-1.5 text-xs text-slate-300">
            ${specs.lighting.map((item) => `<li class="flex items-start gap-1.5"><span class="text-pink-400">•</span><span>${item}</span></li>`).join("")}
          </ul>
        </div>

        <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div class="flex items-center gap-2 mb-2 text-purple-300 text-sm font-bold">
            <span>✒️</span> Typography & Styling
          </div>
          <h4 class="text-sm font-bold text-white mb-1">Stationery & Signage</h4>
          <p class="text-xs text-slate-400 mb-3">Cohesive visual identity</p>
          <ul class="space-y-1.5 text-xs text-slate-300">
            ${specs.styling.map((item) => `<li class="flex items-start gap-1.5"><span class="text-purple-400">•</span><span>${item}</span></li>`).join("")}
          </ul>
        </div>

      </div>
    `;
  },

  getSpecsByEventType(eventType, theme, vibe) {
    if (eventType === "wedding") {
      return {
        ambiance: [
          "Organic textures: travertine pedestals, raw linen table runners, terracotta vessels.",
          "Floral composition: Fresh olive branches, white garden roses, and dried pampas accents.",
          "Dress code: Black-Tie Optional with soft earth-tone touches.",
        ],
        lighting: [
          "300+ dripless taper candles inside glass hurricane chimneys for breezy spaces.",
          "Warm 2400K overhead bistro fairy canopy illuminating the main dining zone.",
          "Soft amber uplights grazing stone walls and ceremony arch backdrop.",
        ],
        styling: [
          "Header typography: Elegant Italian Serif (Cormorant Garamond or Playfair Display).",
          "Body text: Modern clean geometric sans-serif with generous letter spacing.",
          "Paper stock: Deckled-edge 300gsm cotton rag with subtle gold foil stamping.",
        ],
      };
    } else if (eventType === "birthday") {
      return {
        ambiance: [
          "Moody dark surfaces accented by striking neon signage and reflective chrome pedestals.",
          "Velvet modular lounge seating paired with low marble cocktail tables.",
          "Dress code: Cocktail glam with vibrant neon or metallic shimmer accents.",
        ],
        lighting: [
          "Custom LED Neon name script centered on a high-gloss acrylic backdrop.",
          "Battery-powered wireless RGB tube lights pulsing to dance floor music tempos.",
          "UV blacklights highlighting fluorescent signature glassware and tonic ice cubes.",
        ],
        styling: [
          "Header typography: Bold Cyberpunk / Display Gothic with glowing text-shadow.",
          "Signage: Frosted smoke acrylic with metallic vinyl lettering.",
          "Digital invite: Animated MP4 video flyer with looping beat soundtrack.",
        ],
      };
    } else {
      return {
        ambiance: [
          "Eco-friendly burlap banners, picnic quilts, and recycled wooden directional signs.",
          "Open-air pavilion layout designed for easy stroller and wheelchair accessibility.",
          "Dress code: Festive casual, vibrant community spirit attire.",
        ],
        lighting: [
          "Solar-powered string lights lining walking paths and park trees.",
          "High-output LED floodlights illuminating stage performances and food truck alleys.",
          "Emergency exit and sanitation illumination stations.",
        ],
        styling: [
          "Header typography: Friendly, bold humanist sans-serif (Plus Jakarta Sans or Poppins).",
          "Color contrast: High visibility color-coded badges for volunteers and attendees.",
          "Printed map: Recycled kraft paper pocket guides with schedule QR codes.",
        ],
      };
    }
  },

  copyHex(hex) {
    navigator.clipboard.writeText(hex).then(() => {
      App.showToast(`Copied ${hex} to clipboard!`);
    });
  },
};

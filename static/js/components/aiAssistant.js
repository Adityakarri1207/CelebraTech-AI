/**
 * GenAI Conversational Planning Assistant Component.
 * Features luxury chat interface, quick query chips, typing aura, and actionable advice.
 */

const AIAssistantComponent = {
  chatHistory: [],

  init() {
    this.chatHistory = [
      {
        role: "assistant",
        content: "Hello! I am your CelebraTech GenAI planning director. I can help optimize your budget, refine day-of run-of-show schedules, draft custom invitation/toast copy, and guide vendor negotiations. What celebration challenge can we solve today?",
      },
    ];
    this.renderMessages();
  },

  renderMessages() {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    container.innerHTML = this.chatHistory
      .map((msg) => {
        const isUser = msg.role === "user";
        return `
          <div class="flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}">
            ${!isUser ? `
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow-md ai-aura-ring flex-shrink-0">
                ✨
              </div>
            ` : ''}

            <div class="max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
              isUser
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-none shadow-lg'
                : 'bg-white/[0.04] border border-white/10 text-slate-200 rounded-bl-none shadow-md backdrop-blur-md'
            }">
              <div class="whitespace-pre-wrap">${this.formatMarkdown(msg.content)}</div>
            </div>

            ${isUser ? `
              <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 font-bold flex-shrink-0">
                👤
              </div>
            ` : ''}
          </div>
        `;
      })
      .join("");

    container.scrollTop = container.scrollHeight;
  },

  formatMarkdown(text) {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1 py-0.5 rounded text-amber-300 font-mono text-[11px]">$1</code>');
  },

  showTypingIndicator() {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    const typingEl = document.createElement("div");
    typingEl.id = "chat-typing-indicator";
    typingEl.className = "flex items-center gap-3";
    typingEl.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-xs font-bold text-white ai-aura-ring flex-shrink-0">
        ✨
      </div>
      <div class="px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-slate-400 text-xs flex items-center gap-2">
        <span class="inline-block w-2 h-2 rounded-full bg-pink-400 animate-ping"></span>
        <span>CelebraTech AI is curating recommendations...</span>
      </div>
    `;
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
  },

  hideTypingIndicator() {
    const el = document.getElementById("chat-typing-indicator");
    if (el) el.remove();
  },

  async sendMessage(customText = null) {
    const input = document.getElementById("chat-input-field");
    const text = customText || (input ? input.value.trim() : "");
    if (!text) return;

    if (input) input.value = "";

    // Add user message to UI
    this.chatHistory.push({ role: "user", content: text });
    this.renderMessages();
    this.showTypingIndicator();

    try {
      const activeEvent = App.currentEvent;
      const res = await API.chatAssistant({
        event_id: activeEvent ? activeEvent.id : "none",
        message: text,
        history: this.chatHistory.slice(-6),
      });

      this.hideTypingIndicator();
      this.chatHistory.push({ role: "assistant", content: res.reply });
      this.renderMessages();

      // Render suggested actions
      this.renderActionSuggestions(res.suggested_actions || []);
    } catch (err) {
      this.hideTypingIndicator();
      this.chatHistory.push({
        role: "assistant",
        content: `I ran into an issue connecting to the AI service: ${err.message}. Please try again.`,
      });
      this.renderMessages();
    }
  },

  renderActionSuggestions(actions) {
    const container = document.getElementById("chat-suggested-actions");
    if (!container) return;

    if (!actions || actions.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = actions
      .map(
        (action) => `
        <button type="button" onclick="AIAssistantComponent.sendMessage('${action}')" class="px-3 py-1.5 text-xs bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 border border-purple-500/25 rounded-full transition-all text-left">
          💬 ${action}
        </button>
      `
      )
      .join("");
  },
};

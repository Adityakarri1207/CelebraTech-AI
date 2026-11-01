/**
 * CelebraTech AI — Core React 18 Application Component Architecture.
 * Modular, highly interactive, accessible, and structured with pure React state.
 * Includes enhanced Vendor Directory, Seating Chart, 3D Flip Engine, and Pop-up Modals.
 */

const { useState, useEffect, useMemo, useRef } = React;

/**
 * Universal Indian Rupee (INR ₹) Currency Formatter
 * Strict standard formatting using en-IN locale
 */
const formatINR = (amount) => {
  const num = Math.round(Number(amount) || 0);
  return `₹${num.toLocaleString("en-IN")}`;
};

function App() {
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentTab, setCurrentTab] = useState("ideas"); // 'ideas' | 'budget' | 'variance' | 'timeline' | 'vendors' | 'guests' | 'invites' | 'assistant'
  const [activeIdeaFilter, setActiveIdeaFilter] = useState("all");
  const [activeTimelinePhase, setActiveTimelinePhase] = useState("all");
  const [flippedCards, setFlippedCards] = useState({});
  const [adoptedIdeas, setAdoptedIdeas] = useState({});
  const [toasts, setToasts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddTimelineModal, setShowAddTimelineModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, item: null, type: "budget" });

  const openPaymentModal = (item, type = "budget") => {
    setPaymentModal({ isOpen: true, item, type });
  };

  const closePaymentModal = () => {
    setPaymentModal({ isOpen: false, item: null, type: "budget" });
  };

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am your CelebraTech GenAI planning companion. Ask me anything about Indian wedding & party budget allocations, run-of-show logistics, catering ideas, or unique celebration themes!",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // What-If Simulator Budget Value (INR)
  const [simulatorBudget, setSimulatorBudget] = useState(2500000);

  // Toast Notification Helper
  const showToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  // Initial Load
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async (selectedId = null) => {
    try {
      setIsLoading(true);
      const list = await API.getEvents();
      setEvents(list);
      if (list.length > 0) {
        const target = selectedId ? list.find((e) => e.id === selectedId) : list[0];
        const eventId = target ? target.id : list[0].id;
        await selectEvent(eventId);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
      showToast("Could not load celebrations.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const selectEvent = async (eventId) => {
    try {
      const detailed = await API.getEvent(eventId);
      setCurrentEvent(detailed);
      setSimulatorBudget(detailed.total_budget || 2500000);
      setFlippedCards({});
    } catch (err) {
      console.error("Error selecting event:", err);
      showToast("Failed to fetch celebration details.", "error");
    }
  };

  // Toggle 3D Flip Card
  const toggleFlipCard = (cardId, e) => {
    if (e && e.target.closest("button") && !e.target.closest(".flip-btn-trigger")) {
      return;
    }
    setFlippedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  // Toggle Adopted Idea
  const toggleAdoptIdea = (cardId, ideaTitle) => {
    setAdoptedIdeas((prev) => {
      const next = { ...prev, [cardId]: !prev[cardId] };
      showToast(next[cardId] ? `Saved "${ideaTitle}" to your celebration!` : `Removed "${ideaTitle}" from saved ideas.`, "info");
      return next;
    });
  };

  // Confetti trigger
  const triggerConfetti = () => {
    if (window.celebrationConfetti) {
      window.celebrationConfetti.burst(window.innerWidth / 2, window.innerHeight / 2, 85);
    }
    showToast("🎉 Let's Celebrate! Amazing progress on your plans!", "success");
  };

  // Copy text helper
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, "success");
  };

  // Chat message submit
  const handleSendChat = async (promptText = null) => {
    const textToSend = promptText || chatInput;
    if (!textToSend.trim() || isChatLoading) return;

    const newMessages = [...chatMessages, { role: "user", content: textToSend }];
    setChatMessages(newMessages);
    if (!promptText) setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await API.chatAssistant({
        event_id: currentEvent ? currentEvent.id : null,
        message: textToSend,
        event_type: currentEvent ? currentEvent.event_type : "wedding",
        budget: currentEvent ? currentEvent.total_budget : 25000,
        guest_count: currentEvent ? currentEvent.guest_count : 100,
      });

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply || "I analyzed your request and updated the recommendations.",
          tips: res.actionable_tips,
        },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble connecting right now, but your event data is completely safe!" },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (isLoading && !currentEvent) {
    return (
      <div className="app-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem", animation: "spin 2s linear infinite" }}>✨</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Setting Up Your Celebrations...</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>Curating luxury budgets, 3D flip ideas, vendors, and seating.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Dynamic Ambient Background Orbs */}
      <div className="ambient-layer" aria-hidden="true">
        <div className="ambient-orb ambient-orb-1"></div>
        <div className="ambient-orb ambient-orb-2"></div>
        <div className="ambient-orb ambient-orb-3"></div>
      </div>

      {/* Top Navigation Bar with Scrollable Controls */}
      <TopNavbar
        events={events}
        currentEvent={currentEvent}
        onSelectEvent={selectEvent}
        onOpenNewEventModal={() => setShowNewEventModal(true)}
        onTriggerConfetti={triggerConfetti}
      />

      {/* Main Content Area */}
      <main className="max-w-content" style={{ flex: 1, paddingBottom: "3rem" }}>
        {currentEvent && (
          <>
            {/* Hero Summary & Countdown Banner */}
            <EventHeroBanner
              event={currentEvent}
              onTriggerConfetti={triggerConfetti}
            />

            {/* Segmented Tab Navigation Bar */}
            <TabNavigationBar
              currentTab={currentTab}
              onChangeTab={setCurrentTab}
              event={currentEvent}
            />

            {/* Active Tab View */}
            <div className="tab-content">
              {currentTab === "ideas" && (
                <IdeasTab
                  event={currentEvent}
                  activeFilter={activeIdeaFilter}
                  onChangeFilter={setActiveIdeaFilter}
                  flippedCards={flippedCards}
                  onToggleFlip={toggleFlipCard}
                  adoptedIdeas={adoptedIdeas}
                  onToggleAdopt={toggleAdoptIdea}
                  onOpenAIModal={() => setCurrentTab("assistant")}
                />
              )}

              {currentTab === "budget" && (
                <BudgetTab
                  event={currentEvent}
                  simulatorBudget={simulatorBudget}
                  onChangeSimulatorBudget={setSimulatorBudget}
                  onOpenAddModal={() => setShowAddExpenseModal(true)}
                  onOpenPaymentModal={openPaymentModal}
                  onRefreshEvent={() => selectEvent(currentEvent.id)}
                  showToast={showToast}
                />
              )}

              {currentTab === "timeline" && (
                <TimelineTab
                  event={currentEvent}
                  activePhase={activeTimelinePhase}
                  onChangePhase={setActiveTimelinePhase}
                  onOpenAddModal={() => setShowAddTimelineModal(true)}
                  onRefreshEvent={() => selectEvent(currentEvent.id)}
                  showToast={showToast}
                />
              )}

              {currentTab === "vendors" && (
                <VendorsTab
                  event={currentEvent}
                  onOpenAddModal={() => setShowAddVendorModal(true)}
                  onOpenPaymentModal={openPaymentModal}
                  onRefreshEvent={() => selectEvent(currentEvent.id)}
                  showToast={showToast}
                />
              )}

              {currentTab === "guests" && (
                <GuestsTab
                  event={currentEvent}
                  onOpenAddModal={() => setShowAddGuestModal(true)}
                  onRefreshEvent={() => selectEvent(currentEvent.id)}
                  showToast={showToast}
                />
              )}

              {currentTab === "variance" && (
                <CostVarianceTab
                  event={currentEvent}
                  onRefreshEvent={() => selectEvent(currentEvent.id)}
                  showToast={showToast}
                  triggerConfetti={triggerConfetti}
                  onOpenAddExpense={() => setShowAddExpenseModal(true)}
                  onOpenPaymentModal={openPaymentModal}
                />
              )}

              {currentTab === "invites" && (
                <InvitationsTab
                  event={currentEvent}
                  onCopyText={copyToClipboard}
                />
              )}

              {currentTab === "assistant" && (
                <AIAssistantTab
                  event={currentEvent}
                  messages={chatMessages}
                  input={chatInput}
                  setInput={setChatInput}
                  onSend={handleSendChat}
                  isLoading={isChatLoading}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Modals with Pop-Up Animations */}
      {showNewEventModal && (
        <NewEventModal
          onClose={() => setShowNewEventModal(false)}
          onCreated={(newEvent) => {
            setShowNewEventModal(false);
            loadEvents(newEvent.id);
            showToast(`Celebration "${newEvent.title}" created successfully!`, "success");
            triggerConfetti();
          }}
          showToast={showToast}
        />
      )}

      {showAddExpenseModal && currentEvent && (
        <AddExpenseModal
          eventId={currentEvent.id}
          onClose={() => setShowAddExpenseModal(false)}
          onAdded={() => {
            setShowAddExpenseModal(false);
            selectEvent(currentEvent.id);
            showToast("Budget expense item added!", "success");
          }}
          showToast={showToast}
        />
      )}

      {showAddTimelineModal && currentEvent && (
        <AddTimelineModal
          eventId={currentEvent.id}
          onClose={() => setShowAddTimelineModal(false)}
          onAdded={() => {
            setShowAddTimelineModal(false);
            selectEvent(currentEvent.id);
            showToast("Timeline milestone added!", "success");
          }}
          showToast={showToast}
        />
      )}

      {showAddVendorModal && currentEvent && (
        <AddVendorModal
          eventId={currentEvent.id}
          onClose={() => setShowAddVendorModal(false)}
          onAdded={() => {
            setShowAddVendorModal(false);
            selectEvent(currentEvent.id);
            showToast("Vendor added to directory!", "success");
          }}
          showToast={showToast}
        />
      )}

      {showAddGuestModal && currentEvent && (
        <AddGuestModal
          eventId={currentEvent.id}
          onClose={() => setShowAddGuestModal(false)}
          onAdded={() => {
            setShowAddGuestModal(false);
            selectEvent(currentEvent.id);
            showToast("Guest added to RSVP roster!", "success");
          }}
          showToast={showToast}
        />
      )}

      {paymentModal.isOpen && paymentModal.item && currentEvent && (
        <RecordPaymentModal
          eventId={currentEvent.id}
          item={paymentModal.item}
          type={paymentModal.type}
          onClose={closePaymentModal}
          onRecorded={async () => {
            closePaymentModal();
            await selectEvent(currentEvent.id);
            triggerConfetti();
          }}
          showToast={showToast}
        />
      )}

      {/* Floating Toast Notification Stack */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.type === "success" ? "✨" : t.type === "error" ? "⚠️" : "💡"}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   Component: Top Navigation Bar (Scrollable & Responsive)
   ========================================================================== */
function TopNavbar({ events, currentEvent, onSelectEvent, onOpenNewEventModal, onTriggerConfetti }) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <header className="navbar">
      <div className="max-w-content navbar-inner">
        {/* Brand */}
        <div className="brand-section" onClick={onTriggerConfetti} title="Click for celebration confetti!">
          <div className="brand-icon">✨</div>
          <div>
            <div className="brand-title">CelebraTech AI</div>
            <div className="brand-subtitle">GenAI Event & Celebration Architecture</div>
          </div>
        </div>

        {/* Center: Scrollable Controls & Quick Event Switchers */}
        <div className="nav-center-scrollable">
          <div className="event-switcher-wrapper">
            <span className="event-switcher-label">Active:</span>
            <select
              className="event-dropdown"
              value={currentEvent ? currentEvent.id : ""}
              onChange={(e) => onSelectEvent(e.target.value)}
              aria-label="Select celebration"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.event_type === "wedding" ? "💍" : ev.event_type === "birthday" ? "🎂" : "🎪"} {ev.title}
                </option>
              ))}
            </select>
          </div>

          <div className="quick-pills">
            {events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                className={`quick-pill ${currentEvent?.id === ev.id ? "active" : ""}`}
                onClick={() => onSelectEvent(ev.id)}
              >
                {ev.event_type === "wedding" ? "💍 Wedding" : ev.event_type === "birthday" ? "🎂 Birthday" : "🎪 Community"}
              </button>
            ))}
          </div>

          {currentEvent && (
            <div className="nav-stat-pill">
              <span>💰 <strong>{formatINR(currentEvent.total_budget)}</strong></span>
              <span>•</span>
              <span>👥 <strong>{currentEvent.guest_count || 0}</strong> Guests</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="nav-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onTriggerConfetti} title="Celebrate progress">
            <span>🎉</span> Celebrate
          </button>

          {/* Export Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              aria-haspopup="true"
            >
              <span>📥</span> Export ▼
            </button>
            {showExportMenu && currentEvent && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "125%",
                  background: "#111827",
                  border: "1px solid var(--border-glass)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.5rem",
                  width: "220px",
                  boxShadow: "var(--shadow-card)",
                  zIndex: 100,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.3rem",
                  animation: "modalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  onClick={() => {
                    API.downloadExport(currentEvent.id, "markdown");
                    setShowExportMenu(false);
                  }}
                >
                  📄 Complete Plan (MD)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  onClick={() => {
                    API.downloadExport(currentEvent.id, "budget");
                    setShowExportMenu(false);
                  }}
                >
                  💰 Budget Sheet (CSV)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  onClick={() => {
                    API.downloadExport(currentEvent.id, "vendors");
                    setShowExportMenu(false);
                  }}
                >
                  📋 Vendor Directory (CSV)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  onClick={() => {
                    API.downloadExport(currentEvent.id, "guests");
                    setShowExportMenu(false);
                  }}
                >
                  👥 Guest List (CSV)
                </button>
              </div>
            )}
          </div>

          <button type="button" className="btn btn-primary btn-sm" onClick={onOpenNewEventModal}>
            <span>➕</span> New Event
          </button>
        </div>
      </div>
    </header>
  );
}

/* ==========================================================================
   Component: Hero Summary & Live Countdown Banner
   ========================================================================== */
function EventHeroBanner({ event, onTriggerConfetti }) {
  const [timeLeft, setTimeLeft] = useState({ days: 16, hours: 8, minutes: 22, seconds: 45 });

  useEffect(() => {
    const calculateTime = () => {
      const target = event.date ? new Date(event.date).getTime() : Date.now() + 16 * 86400000;
      const now = Date.now();
      const diff = Math.max(0, target - now);

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [event.date]);

  const totalBudget = event.total_budget || 0;
  const committedBudget = (event.budget_items || []).reduce((acc, i) => acc + (i.actual_cost > 0 ? i.actual_cost : i.estimated_cost), 0);
  const spentPct = totalBudget > 0 ? Math.min(100, Math.round((committedBudget / totalBudget) * 100)) : 0;

  const timelineTotal = (event.timeline_items || []).length;
  const timelineDone = (event.timeline_items || []).filter((t) => t.completed).length;
  const vendorTasksTotal = (event.vendors || []).reduce((acc, v) => acc + ((v.checklist_tasks || v.checklist || []).length), 0);
  const vendorTasksDone = (event.vendors || []).reduce((acc, v) => acc + ((v.completed_tasks || []).length), 0);
  const totalTasks = timelineTotal + vendorTasksTotal;
  const completedTasks = timelineDone + vendorTasksDone;
  const tasksPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalGuests = (event.guests || []).length;
  const totalHeadcount = (event.guests || []).reduce((acc, g) => acc + (g.party_size || 1), 0);
  const confirmedHeadcount = (event.guests || [])
    .filter((g) => g.rsvp_status === "confirmed")
    .reduce((acc, g) => acc + (g.party_size || 1), 0);

  const typeBadgeClass =
    event.event_type === "wedding"
      ? "badge-wedding"
      : event.event_type === "birthday"
      ? "badge-birthday"
      : event.event_type === "community"
      ? "badge-community"
      : "badge-general";

  return (
    <section className="hero-banner">
      <div className="hero-top-row">
        <div className="hero-title-group">
          <div className={`event-type-badge ${typeBadgeClass}`}>
            <span>{event.event_type === "wedding" ? "💍" : event.event_type === "birthday" ? "🎂" : "🎪"}</span>
            <span>{event.event_type.toUpperCase()} CELEBRATION</span>
          </div>
          <h1 className="hero-title">{event.title}</h1>
          <div className="hero-meta-row">
            <span className="hero-meta-item">
              <span>📅</span> <strong>{event.date || "Date TBA"}</strong>
            </span>
            <span className="hero-meta-item">
              <span>📍</span> {event.location || "Location TBA"}
            </span>
            <span className="hero-meta-item">
              <span>👥</span> {event.guest_count || 0} Target Guests
            </span>
            {event.vibe && (
              <span className="hero-meta-item">
                <span>✨</span> <em>"{event.vibe}"</em>
              </span>
            )}
          </div>
        </div>

        {/* Live Countdown Display */}
        <div className="countdown-box" onClick={onTriggerConfetti} style={{ cursor: "pointer" }} title="Click for celebration confetti!">
          <div className="countdown-unit">
            <div className="countdown-val">{String(timeLeft.days).padStart(2, "0")}</div>
            <div className="countdown-lbl">Days</div>
          </div>
          <div className="countdown-sep">:</div>
          <div className="countdown-unit">
            <div className="countdown-val">{String(timeLeft.hours).padStart(2, "0")}</div>
            <div className="countdown-lbl">Hours</div>
          </div>
          <div className="countdown-sep">:</div>
          <div className="countdown-unit">
            <div className="countdown-val">{String(timeLeft.minutes).padStart(2, "0")}</div>
            <div className="countdown-lbl">Mins</div>
          </div>
          <div className="countdown-sep">:</div>
          <div className="countdown-unit">
            <div className="countdown-val">{String(timeLeft.seconds).padStart(2, "0")}</div>
            <div className="countdown-lbl">Secs</div>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="hero-kpis">
        <div className="hero-kpi-item">
          <div className="hero-kpi-label">BUDGET COMMITTED</div>
          <div className="hero-kpi-val">
            {formatINR(committedBudget)} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/ {formatINR(totalBudget)}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill progress-fill-rose" style={{ width: `${spentPct}%` }}></div>
          </div>
        </div>

        <div className="hero-kpi-item">
          <div className="hero-kpi-label">TASKS COMPLETED</div>
          <div className="hero-kpi-val">
            {completedTasks} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/ {totalTasks} ({tasksPct}%)</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill progress-fill-emerald" style={{ width: `${tasksPct}%` }}></div>
          </div>
        </div>

        <div className="hero-kpi-item">
          <div className="hero-kpi-label">CONFIRMED HEADCOUNT</div>
          <div className="hero-kpi-val">
            {confirmedHeadcount} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/ {totalHeadcount} Total ({totalGuests} Parties)</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${totalHeadcount > 0 ? (confirmedHeadcount / totalHeadcount) * 100 : 0}%`, background: "var(--accent-cyan)" }}></div>
          </div>
        </div>

        <div className="hero-kpi-item">
          <div className="hero-kpi-label">COLOR PALETTE</div>
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
            {(event.color_palette || []).slice(0, 5).map((color, idx) => (
              <div
                key={idx}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: color.hex_code,
                  border: "2px solid rgba(255,255,255,0.25)",
                }}
                title={`${color.name} (${color.hex_code})`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Component: Tab Navigation Bar (Smoothly Scrollable with Controls)
   ========================================================================== */
function TabNavigationBar({ currentTab, onChangeTab, event }) {
  const tabsRef = useRef(null);

  const tabs = [
    { id: "ideas", label: "3D Flip Ideas", icon: "💡", count: (event.ideas || []).length },
    { id: "budget", label: "Budget & Allocations", icon: "💰", count: (event.budget_items || []).length },
    { id: "variance", label: "Cost & Variance Ledger", icon: "📊", count: (event.budget_items || []).length },
    { id: "timeline", label: "Timeline & Schedule", icon: "⏱️", count: (event.timeline_items || []).length },
    { id: "vendors", label: "Vendor Directory", icon: "📋", count: (event.vendors || []).length },
    { id: "guests", label: "Guests & Seating", icon: "👥", count: (event.guests || []).length },
    { id: "invites", label: "Invitations & Speeches", icon: "💌" },
    { id: "assistant", label: "GenAI Co-Planner", icon: "🤖" },
  ];

  const scrollTabs = (offset) => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="tabs-nav-wrapper">
      <button
        type="button"
        className="tabs-scroll-btn tabs-scroll-prev"
        onClick={() => scrollTabs(-220)}
        aria-label="Scroll tabs left"
        title="Scroll left"
      >
        ‹
      </button>

      <nav className="tabs-nav" ref={tabsRef} aria-label="Celebration Sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${currentTab === tab.id ? "active" : ""}`}
            onClick={() => onChangeTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {typeof tab.count === "number" && <span className="tab-count">{tab.count}</span>}
          </button>
        ))}
      </nav>

      <button
        type="button"
        className="tabs-scroll-btn tabs-scroll-next"
        onClick={() => scrollTabs(220)}
        aria-label="Scroll tabs right"
        title="Scroll right"
      >
        ›
      </button>
    </div>
  );
}

/* ==========================================================================
   Tab View: 3D Flip Card Ideas
   ========================================================================== */
function IdeasTab({ event, activeFilter, onChangeFilter, flippedCards, onToggleFlip, adoptedIdeas, onToggleAdopt, onOpenAIModal }) {
  const ideas = event.ideas || [];

  const categories = useMemo(() => {
    const set = new Set(ideas.map((i) => i.category));
    return ["all", ...Array.from(set)];
  }, [ideas]);

  const filteredIdeas = useMemo(() => {
    if (activeFilter === "all") return ideas;
    return ideas.filter((i) => i.category === activeFilter);
  }, [ideas, activeFilter]);

  return (
    <div>
      <div className="section-header">
        <div className="section-title-group">
          <h2>Personalized 3D Celebration Ideas</h2>
          <p>Click anywhere on a card to flip it in 3D and view detailed recipes, execution blueprints & vendor tips.</p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <div className="filter-bar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-chip ${activeFilter === cat ? "active" : ""}`}
                onClick={() => onChangeFilter(cat)}
              >
                {cat === "all" ? "All Categories" : cat.toUpperCase()}
              </button>
            ))}
          </div>

          <button type="button" className="btn btn-primary btn-sm" onClick={onOpenAIModal}>
            <span>✨</span> Ask GenAI
          </button>
        </div>
      </div>

      {filteredIdeas.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "4rem 2rem", borderRadius: "var(--radius-xl)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>💡</div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>No ideas found for this filter</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>Try selecting another category or generate new ideas with AI.</p>
        </div>
      ) : (
        <div className="ideas-grid">
          {filteredIdeas.map((idea) => {
            const isFlipped = !!flippedCards[idea.id];
            const isAdopted = !!adoptedIdeas[idea.id];
            const executionSteps = idea.flip_content?.items || idea.details || [];

            return (
              <div
                key={idea.id}
                className={`flip-card ${isFlipped ? "flipped" : ""}`}
                onClick={(e) => onToggleFlip(idea.id, e)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggleFlip(idea.id, e);
                  }
                }}
                role="button"
                aria-pressed={isFlipped}
                aria-label={`Idea card: ${idea.title}. Click anywhere to flip.`}
              >
                <div className="flip-card-inner">
                  {/* Front Side */}
                  <div className="flip-card-front">
                    <div>
                      <div className="card-top-row">
                        <span className="card-category-badge">{idea.category}</span>
                        <span className="budget-tier">{idea.badge || "Curated"}</span>
                      </div>
                      <h3 className="card-title">{idea.title}</h3>
                      {idea.tagline && <p style={{ fontSize: "0.8rem", color: "var(--accent-gold)", fontWeight: 600, marginBottom: "0.5rem" }}>"{idea.tagline}"</p>}
                      <p className="card-desc">{idea.description}</p>
                      {idea.details && idea.details.length > 0 && (
                        <div className="card-tags">
                          {idea.details.slice(0, 3).map((d, idx) => (
                            <span key={idx} className="card-tag">✨ {d}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flip-hint">
                      <span>Click anywhere to view execution blueprint</span>
                      <span className="flip-arrow-icon">🔄</span>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="flip-card-back">
                    <div>
                      <div className="back-section-title">
                        {idea.flip_content?.subtitle || "Execution Blueprints & Notes"}
                      </div>
                      <ul className="back-steps-list">
                        {executionSteps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>

                      {idea.recommended_vendor && (
                        <div className="vendor-pairing-box">
                          <div className="vendor-pairing-title">Recommended Vendor Category:</div>
                          <div>{idea.recommended_vendor}</div>
                        </div>
                      )}
                    </div>

                    <div className="adopt-btn-row">
                      <button
                        type="button"
                        className={`btn btn-sm ${isAdopted ? "btn-gold" : "btn-primary"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleAdopt(idea.id, idea.title);
                        }}
                      >
                        <span>{isAdopted ? "★ Saved to Plan" : "☆ Save This Idea"}</span>
                      </button>

                      <span style={{ fontSize: "0.75rem", color: "var(--accent-purple)", cursor: "pointer" }} className="flip-btn-trigger">
                        Flip Back 🔄
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Tab View: Budget & What-If Simulator
   ========================================================================== */
function BudgetTab({ event, simulatorBudget, onChangeSimulatorBudget, onOpenAddModal, onOpenPaymentModal, onRefreshEvent, showToast }) {
  const items = event.budget_items || [];
  const totalBudget = Number(event.total_budget || 0);

  const totalEstimated = items.reduce((sum, i) => sum + (Number(i.estimated_cost) || 0), 0);
  const totalActual = items.reduce((sum, i) => sum + (Number(i.actual_cost) || 0), 0);
  const totalPaid = items.filter((i) => i.paid).reduce((sum, i) => sum + (Number(i.actual_cost > 0 ? i.actual_cost : i.estimated_cost) || 0), 0);
  const effectiveExpense = totalActual > 0 ? totalActual : totalEstimated;
  const netVariance = totalEstimated - totalActual; // Positive = savings/profit, Negative = overrun/loss
  const remainingReserves = totalBudget - effectiveExpense;
  const paidPct = effectiveExpense > 0 ? Math.min(100, Math.round((totalPaid / effectiveExpense) * 100)) : 0;

  const simBreakdown = useMemo(() => {
    return [
      { name: "Venue & Rentals", pct: 35, amount: Math.round(simulatorBudget * 0.35) },
      { name: "Catering & Bar", pct: 30, amount: Math.round(simulatorBudget * 0.30) },
      { name: "Decor & Floral", pct: 12, amount: Math.round(simulatorBudget * 0.12) },
      { name: "Entertainment & Music", pct: 8, amount: Math.round(simulatorBudget * 0.08) },
      { name: "Photography & Media", pct: 7, amount: Math.round(simulatorBudget * 0.07) },
      { name: "Attire & Favors", pct: 5, amount: Math.round(simulatorBudget * 0.05) },
      { name: "Contingency Fund", pct: 3, amount: Math.round(simulatorBudget * 0.03) },
    ];
  }, [simulatorBudget]);

  const handleDeleteItem = async (itemId) => {
    try {
      await API.deleteBudgetItem(event.id, itemId);
      showToast("Budget line item removed.", "info");
      await onRefreshEvent();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete line item.", "error");
    }
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-title-group">
          <h2>Budget Allocations & Expense Tracking</h2>
          <p>Real-time Estimated vs Actual expense monitoring, profit/loss variance tracking in Indian Rupees (₹), and What-If simulator.</p>
        </div>

        <button type="button" className="btn btn-primary" onClick={onOpenAddModal}>
          <span>➕</span> Add Expense
        </button>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="budget-grid-metrics">
        <div className="metric-card">
          <div className="metric-card-label">TOTAL EVENT BUDGET</div>
          <div className="metric-card-val">{formatINR(totalBudget)}</div>
          <div className="metric-card-sub">Approved ceiling in INR</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-label">TOTAL ESTIMATED BUDGET</div>
          <div className="metric-card-val" style={{ color: totalEstimated > totalBudget ? "var(--accent-rose)" : "#ffffff" }}>
            {formatINR(totalEstimated)}
          </div>
          <div className="metric-card-sub">
            Planned across {items.length} line items
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-label">TOTAL ACTUAL SETTLED</div>
          <div className="metric-card-val" style={{ color: "var(--accent-emerald)" }}>
            {formatINR(totalPaid)}
          </div>
          <div className="metric-card-sub">{items.filter((i) => i.paid).length} of {items.length} items settled ({paidPct}%)</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-label">VARIANCE & PROFIT / LOSS</div>
          <div className="metric-card-val" style={{ color: totalActual === 0 ? "var(--accent-cyan)" : netVariance >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
            {totalActual === 0 ? "₹0 (Pending)" : netVariance >= 0 ? `+${formatINR(netVariance)} Profit` : `-${formatINR(Math.abs(netVariance))} Overrun`}
          </div>
          <div className="metric-card-sub">
            {totalActual === 0
              ? `Awaiting actual invoices • Reserves: ${formatINR(remainingReserves)}`
              : netVariance >= 0
              ? `🟢 Saved under estimation • Reserves: ${formatINR(remainingReserves)}`
              : `🔴 Deficit overrun • Reserves: ${formatINR(remainingReserves)}`}
          </div>
        </div>
      </div>

      {/* Interactive What-If Budget Simulator */}
      <div className="simulator-card">
        <div className="simulator-header">
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff" }}>What-If Budget Allocation Simulator</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Drag the slider to test different celebration budgets and review recommended industry allocations in Indian Rupees (₹).
            </p>
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--accent-gold)" }}>
            {formatINR(simulatorBudget)}
          </div>
        </div>

        <input
          type="range"
          min="100000"
          max="10000000"
          step="50000"
          value={simulatorBudget}
          onChange={(e) => onChangeSimulatorBudget(Number(e.target.value))}
          className="simulator-slider"
          aria-label="What-if budget slider"
        />

        <div className="simulator-breakdown-grid">
          {simBreakdown.map((b, idx) => (
            <div key={idx} className="simulator-item">
              <div className="simulator-item-cat">{b.name} ({b.pct}%)</div>
              <div className="simulator-item-val">{formatINR(b.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Data Table with Variance Column */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item / Service</th>
              <th>Category</th>
              <th>Estimated Cost</th>
              <th>Actual Cost</th>
              <th>Cost Variance (Profit/Loss)</th>
              <th>Payment Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  No budget items added yet. Click "+ Add Expense" to begin tracking.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const est = Number(item.estimated_cost || 0);
                const act = Number(item.actual_cost || 0);
                const diff = est - act;
                const isSavings = diff > 0;
                const isOverrun = diff < 0;

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      {item.notes && <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{item.notes}</div>}
                    </td>
                    <td>
                      <span className="card-category-badge" style={{ fontSize: "0.7rem" }}>{item.category}</span>
                    </td>
                    <td>{formatINR(est)}</td>
                    <td>
                      {act > 0 ? (
                        <strong style={{ color: act > est ? "var(--accent-rose)" : "#ffffff" }}>
                          {formatINR(act)}
                        </strong>
                      ) : (
                        <span style={{ color: "var(--text-dim)", fontSize: "0.8rem", fontStyle: "italic" }}>Not Invoiced</span>
                      )}
                    </td>
                    <td>
                      {act > 0 ? (
                        <span className={`status-badge ${isSavings ? "status-paid" : isOverrun ? "status-declined" : "status-confirmed"}`}>
                          {isSavings ? `✓ -${formatINR(diff)} (Saved/Profit)` : isOverrun ? `⚠️ +${formatINR(Math.abs(diff))} (Overrun/Loss)` : "Exact Match"}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>Pending Payment</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-sm ${item.paid ? "btn-secondary" : "btn-gold"}`}
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                        onClick={() => onOpenPaymentModal(item, "budget")}
                        title={item.paid ? "Click to view or edit actual payment details" : "Click to enter actual amount spent and confirm payment"}
                      >
                        {item.paid ? (
                          <><span>✓ Paid</span> <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>({formatINR(act > 0 ? act : est)}) ✎</span></>
                        ) : (
                          <><span>💳</span> <span>Record Payment</span></>
                        )}
                      </button>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDeleteItem(item.id)}
                        title="Remove line item"
                        style={{ color: "var(--accent-rose)", borderColor: "rgba(244,63,94,0.3)" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ==========================================================================
   Tab View: Timeline & Run-of-Show
   ========================================================================== */
function TimelineTab({ event, activePhase, onChangePhase, onOpenAddModal, onRefreshEvent, showToast }) {
  const items = event.timeline_items || [];
  const phases = ["all", "pre_event", "week_of", "day_of", "post_event"];

  const filteredItems = useMemo(() => {
    if (activePhase === "all") return items;
    return items.filter((i) => i.phase === activePhase);
  }, [items, activePhase]);

  const handleToggle = async (itemId) => {
    try {
      await API.toggleTimelineItem(event.id, itemId);
      onRefreshEvent();
      showToast("Milestone updated!", "success");
    } catch (err) {
      console.error("Toggle error:", err);
      showToast("Failed to update milestone.", "error");
    }
  };

  const handleDelete = async (itemId) => {
    try {
      await API.deleteTimelineItem(event.id, itemId);
      onRefreshEvent();
      showToast("Timeline item deleted.", "info");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to remove milestone.", "error");
    }
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-title-group">
          <h2>Timeline & Day-Of Run-of-Show</h2>
          <p>Organize planning milestones, countdown tasks, and hour-by-hour event day schedules.</p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <div className="filter-bar">
            {phases.map((p) => (
              <button
                key={p}
                type="button"
                className={`filter-chip ${activePhase === p ? "active" : ""}`}
                onClick={() => onChangePhase(p)}
              >
                {p === "all"
                  ? "All Milestones"
                  : p === "pre_event"
                  ? "Pre-Planning"
                  : p === "week_of"
                  ? "Week-Of Prep"
                  : p === "day_of"
                  ? "Day-Of Schedule"
                  : "Wrap-Up"}
              </button>
            ))}
          </div>

          <button type="button" className="btn btn-primary" onClick={onOpenAddModal}>
            <span>➕</span> Add Schedule Item
          </button>
        </div>
      </div>

      <div className="timeline-list">
        {filteredItems.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: "center", padding: "4rem 2rem", borderRadius: "var(--radius-xl)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⏱️</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>No schedule items for this phase</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Click "+ Add Schedule Item" to build out this phase.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="timeline-item-card">
              <div className="timeline-left">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggle(item.id)}
                  className="timeline-checkbox"
                  aria-label={`Mark ${item.title} as completed`}
                />
                <div className="timeline-info">
                  <span className={`timeline-title ${item.completed ? "completed" : ""}`}>{item.title}</span>
                  {item.notes && <span className="timeline-notes">{item.notes}</span>}
                </div>
              </div>

              <div className="timeline-right">
                <span className="phase-pill">{item.time_or_offset}</span>
                {item.owner && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600 }}>
                    Lead: {item.owner}
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleDelete(item.id)}
                  style={{ color: "var(--accent-rose)", borderColor: "rgba(244,63,94,0.3)" }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Tab View: Vendor Directory & Deliverables (Accurate & Interactive)
   ========================================================================== */
function VendorsTab({ event, onOpenAddModal, onOpenPaymentModal, onRefreshEvent, showToast }) {
  const vendors = event.vendors || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");

  const stageOptions = [
    { label: "Researching", val: "Researching" },
    { label: "Contacted", val: "Contacted" },
    { label: "Quote Received", val: "Quote Received" },
    { label: "Contract Signed", val: "Contract Signed" },
    { label: "Deposit Paid", val: "Deposit Paid" },
    { label: "Fully Paid", val: "Fully Paid" },
  ];

  const categories = useMemo(() => {
    const set = new Set(vendors.map((v) => v.category));
    return ["all", ...Array.from(set)];
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const vName = v.name || "";
      const vContact = v.contact_name || v.contact_person || "";
      const vCat = v.category || "";
      const matchesSearch =
        vName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vContact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vCat.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === "all" || v.category === selectedCategory;
      const matchesStage = selectedStage === "all" || v.status === selectedStage;

      return matchesSearch && matchesCat && matchesStage;
    });
  }, [vendors, searchQuery, selectedCategory, selectedStage]);

  // Aggregate stats
  const totalQuoted = vendors.reduce((sum, v) => sum + (v.quoted_price || v.quoted_cost || 0), 0);
  const contractedVendors = vendors.filter((v) =>
    ["Contract Signed", "Deposit Paid", "Fully Paid"].includes(v.status)
  ).length;

  const handleStatusChange = async (vendorId, newStatus) => {
    if (newStatus === "Fully Paid") {
      const targetVendor = vendors.find((item) => item.id === vendorId);
      if (targetVendor && onOpenPaymentModal) {
        onOpenPaymentModal(targetVendor, "vendor");
        return;
      }
    }
    try {
      await API.updateVendorStatus(event.id, vendorId, newStatus);
      onRefreshEvent();
      showToast(`Vendor status updated to ${newStatus}!`, "success");
    } catch (err) {
      console.error("Status update error:", err);
      showToast("Failed to update vendor status.", "error");
    }
  };

  const handleToggleTask = async (vendorId, taskName) => {
    try {
      await API.toggleVendorTask(event.id, vendorId, taskName);
      onRefreshEvent();
      showToast(`Toggled: "${taskName}"`, "success");
    } catch (err) {
      console.error("Toggle task error:", err);
      showToast("Could not toggle deliverable task.", "error");
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    try {
      await API.deleteVendor(event.id, vendorId);
      onRefreshEvent();
      showToast("Vendor removed from directory.", "info");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to remove vendor.", "error");
    }
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-title-group">
          <h2>Vendor Directory & Deliverables Checklists</h2>
          <p>Track supplier quotes, deposit milestones, and day-of vendor deliverables.</p>
        </div>

        <button type="button" className="btn btn-primary" onClick={onOpenAddModal}>
          <span>➕</span> Add Vendor
        </button>
      </div>

      {/* Vendor Stats Bar */}
      <div className="guest-stats-grid">
        <div className="guest-stat-box">
          <div className="guest-stat-box-val">{vendors.length}</div>
          <div className="guest-stat-box-lbl">TOTAL VENDORS</div>
        </div>
        <div className="guest-stat-box">
          <div className="guest-stat-box-val" style={{ color: "var(--accent-gold)" }}>{formatINR(totalQuoted)}</div>
          <div className="guest-stat-box-lbl">TOTAL QUOTED</div>
        </div>
        <div className="guest-stat-box">
          <div className="guest-stat-box-val" style={{ color: "var(--accent-emerald)" }}>{contractedVendors}</div>
          <div className="guest-stat-box-lbl">CONTRACTED / SIGNED</div>
        </div>
        <div className="guest-stat-box">
          <div className="guest-stat-box-val" style={{ color: "var(--accent-cyan)" }}>
            {vendors.filter((v) => v.status === "Fully Paid").length}
          </div>
          <div className="guest-stat-box-lbl">FULLY PAID VENDORS</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div className="filter-bar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`filter-chip ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>

        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search vendors or contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="vendors-grid">
        {filteredVendors.length === 0 ? (
          <div className="glass-panel" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "4rem 2rem", borderRadius: "var(--radius-xl)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📋</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>No vendors match your search</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>Try adjusting filters or search terms.</p>
          </div>
        ) : (
          filteredVendors.map((v) => {
            const contact = v.contact_name || v.contact_person || "";
            const quote = Number(v.quoted_price || v.quoted_cost || 0);
            const tasks = v.checklist_tasks || v.checklist || [];
            const completed = v.completed_tasks || [];
            const doneCount = tasks.filter((t) => completed.includes(t)).length;
            const taskPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

            return (
              <div key={v.id} className="vendor-card">
                <div>
                  <div className="vendor-header">
                    <div>
                      <h3 className="vendor-name">{v.name}</h3>
                      <div className="vendor-cat">{v.category}</div>
                    </div>

                    <select
                      value={v.status}
                      onChange={(e) => handleStatusChange(v.id, e.target.value)}
                      className="form-select"
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", cursor: "pointer" }}
                      aria-label="Vendor status"
                    >
                      {stageOptions.map((s) => (
                        <option key={s.val} value={s.val}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="vendor-contact-info">
                    {contact && <span>👤 Contact: <strong>{contact}</strong></span>}
                    {v.email && <span>✉️ {v.email}</span>}
                    {v.phone && <span>📞 {v.phone}</span>}
                    <span>💵 Quoted: <strong style={{ color: "var(--accent-gold)" }}>{formatINR(quote)}</strong></span>
                  </div>

                  {/* Deliverables Checklist with interactive completion */}
                  <div className="vendor-deliverables">
                    <div className="vendor-deliverables-header">
                      <span className="vendor-deliverables-title">Deliverables Checklist</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", fontWeight: 700 }}>
                        {doneCount} / {tasks.length} ({taskPct}%)
                      </span>
                    </div>

                    <div className="progress-track" style={{ marginBottom: "0.75rem" }}>
                      <div className="progress-fill" style={{ width: `${taskPct}%`, background: "var(--accent-cyan)" }}></div>
                    </div>

                    {tasks.length === 0 ? (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>No checklist items defined.</div>
                    ) : (
                      <ul className="vendor-task-list">
                        {tasks.map((task, idx) => {
                          const isDone = completed.includes(task);
                          return (
                            <li
                              key={idx}
                              className={`vendor-task-item ${isDone ? "completed" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTask(v.id, task);
                              }}
                              title="Click to toggle deliverable completion"
                            >
                              <input
                                type="checkbox"
                                checked={isDone}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => handleToggleTask(v.id, task)}
                              />
                              <span>{task}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-light)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
                  <span className={`status-badge ${v.status === "Fully Paid" ? "status-paid" : "status-pending"}`}>
                    {v.status}
                  </span>

                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    {v.status !== "Fully Paid" ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-gold"
                        style={{ fontSize: "0.725rem", padding: "0.25rem 0.55rem" }}
                        onClick={() => onOpenPaymentModal && onOpenPaymentModal(v, "vendor")}
                        title="Mark Fully Paid & record actual amount spent"
                      >
                        💳 Record Payment
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: "0.725rem", padding: "0.25rem 0.55rem" }}
                        onClick={() => onOpenPaymentModal && onOpenPaymentModal(v, "vendor")}
                        title="View or adjust payment settlement"
                      >
                        ✓ Settled ✎
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDeleteVendor(v.id)}
                      style={{ color: "var(--accent-rose)", borderColor: "rgba(244,63,94,0.3)" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Tab View: Guests & Table Seating Chart (Accurate & Interactive)
   ========================================================================== */
function GuestsTab({ event, onOpenAddModal, onRefreshEvent, showToast }) {
  const guests = event.guests || [];
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'chart'
  const [searchQuery, setSearchQuery] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState("all");

  // Accurate dietary tally
  const dietaryCounts = useMemo(() => {
    const counts = {};
    guests.forEach((g) => {
      const diet = g.dietary || g.dietary_notes || "Standard";
      counts[diet] = (counts[diet] || 0) + (g.party_size || 1);
    });
    return counts;
  }, [guests]);

  // Aggregate Headcount
  const totalHeadcount = guests.reduce((sum, g) => sum + (g.party_size || 1), 0);
  const confirmedHeadcount = guests
    .filter((g) => g.rsvp_status === "confirmed")
    .reduce((sum, g) => sum + (g.party_size || 1), 0);
  const pendingHeadcount = guests
    .filter((g) => g.rsvp_status === "pending")
    .reduce((sum, g) => sum + (g.party_size || 1), 0);
  const declinedHeadcount = guests
    .filter((g) => g.rsvp_status === "declined")
    .reduce((sum, g) => sum + (g.party_size || 1), 0);

  // Filtered Guests
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const gName = g.name || g.full_name || "";
      const gDiet = g.dietary || g.dietary_notes || "Standard";
      const matchesSearch =
        gName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gDiet.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(g.table_number || "").includes(searchQuery);

      const matchesDiet = dietaryFilter === "all" || gDiet === dietaryFilter;
      return matchesSearch && matchesDiet;
    });
  }, [guests, searchQuery, dietaryFilter]);

  // Group by table for Table Chart view
  const tablesMap = useMemo(() => {
    const map = {};
    guests.forEach((g) => {
      const tbl = g.table_number ? `Table ${g.table_number}` : (g.table_assignment || "Unassigned Table");
      if (!map[tbl]) map[tbl] = [];
      map[tbl].push(g);
    });
    return map;
  }, [guests]);

  const handleRSVPChange = async (guestId, newStatus) => {
    try {
      await API.updateGuestRSVP(event.id, guestId, newStatus);
      onRefreshEvent();
      showToast(`Guest RSVP marked as ${newStatus}!`, "success");
    } catch (err) {
      console.error("RSVP error:", err);
      showToast("Failed to update RSVP.", "error");
    }
  };

  const handleDeleteGuest = async (guestId) => {
    try {
      await API.deleteGuest(event.id, guestId);
      onRefreshEvent();
      showToast("Guest removed from roster.", "info");
    } catch (err) {
      console.error("Delete guest error:", err);
      showToast("Failed to delete guest.", "error");
    }
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-title-group">
          <h2>Guest RSVP Roster & Seating Allocations</h2>
          <p>Track party headcount, meal requirements, and interactive table seating.</p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* View Toggle */}
          <div className="filter-bar">
            <button
              type="button"
              className={`filter-chip ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              📋 Roster List
            </button>
            <button
              type="button"
              className={`filter-chip ${viewMode === "chart" ? "active" : ""}`}
              onClick={() => setViewMode("chart")}
            >
              🪑 Seating Chart View
            </button>
          </div>

          <button type="button" className="btn btn-primary" onClick={onOpenAddModal}>
            <span>➕</span> Add Guest
          </button>
        </div>
      </div>

      {/* Headcount Stats Grid */}
      <div className="guest-stats-grid">
        <div className="guest-stat-box">
          <div className="guest-stat-box-val">{totalHeadcount}</div>
          <div className="guest-stat-box-lbl">TOTAL HEADCOUNT ({guests.length} Parties)</div>
        </div>
        <div className="guest-stat-box">
          <div className="guest-stat-box-val" style={{ color: "var(--accent-emerald)" }}>{confirmedHeadcount}</div>
          <div className="guest-stat-box-lbl">CONFIRMED ATTENDING</div>
        </div>
        <div className="guest-stat-box">
          <div className="guest-stat-box-val" style={{ color: "var(--accent-gold)" }}>{pendingHeadcount}</div>
          <div className="guest-stat-box-lbl">PENDING RESPONSE</div>
        </div>
        <div className="guest-stat-box">
          <div className="guest-stat-box-val" style={{ color: "var(--accent-rose)" }}>{declinedHeadcount}</div>
          <div className="guest-stat-box-lbl">DECLINED ATTENDANCE</div>
        </div>
      </div>

      {/* Dietary Badges & Search Filter */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div className="filter-bar">
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", alignSelf: "center" }}>Dietary:</span>
          <button
            type="button"
            className={`filter-chip ${dietaryFilter === "all" ? "active" : ""}`}
            onClick={() => setDietaryFilter("all")}
          >
            All Diets
          </button>
          {Object.entries(dietaryCounts).map(([diet, count]) => (
            <button
              key={diet}
              type="button"
              className={`filter-chip ${dietaryFilter === diet ? "active" : ""}`}
              onClick={() => setDietaryFilter(diet)}
            >
              🥗 {diet} ({count})
            </button>
          ))}
        </div>

        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search guests or dietary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* View 1: Roster List Table */}
      {viewMode === "list" && (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Party Size</th>
                <th>RSVP Status</th>
                <th>Table Assignment</th>
                <th>Dietary Preference</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    No guests match your search criteria. Click "+ Add Guest" to invite attendees.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((g) => {
                  const gName = g.name || g.full_name || "Guest";
                  const gDiet = g.dietary || g.dietary_notes || "Standard";
                  const gTable = g.table_number ? `Table ${g.table_number}` : (g.table_assignment || "Unassigned");

                  return (
                    <tr key={g.id}>
                      <td>
                        <strong>{gName}</strong>
                        {g.notes && <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{g.notes}</div>}
                        {g.email_or_phone && <div style={{ fontSize: "0.725rem", color: "var(--accent-purple)" }}>{g.email_or_phone}</div>}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{g.party_size || 1}</span> Person(s)
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.3rem" }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${g.rsvp_status === "confirmed" ? "btn-primary" : "btn-secondary"}`}
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}
                            onClick={() => handleRSVPChange(g.id, "confirmed")}
                            title="Mark Attending"
                          >
                            ✓ Confirmed
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${g.rsvp_status === "pending" ? "btn-gold" : "btn-secondary"}`}
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}
                            onClick={() => handleRSVPChange(g.id, "pending")}
                            title="Mark Pending"
                          >
                            ⏳ Pending
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${g.rsvp_status === "declined" ? "btn-primary" : "btn-secondary"}`}
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", background: g.rsvp_status === "declined" ? "var(--accent-rose)" : "" }}
                            onClick={() => handleRSVPChange(g.id, "declined")}
                            title="Mark Declined"
                          >
                            ✕ Declined
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className="guest-table-badge">🪑 {gTable}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.775rem", color: gDiet !== "Standard" ? "var(--accent-gold)" : "var(--text-muted)" }}>
                          {gDiet !== "Standard" ? `🥗 ${gDiet}` : "Standard"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDeleteGuest(g.id)}
                          style={{ color: "var(--accent-rose)", borderColor: "rgba(244,63,94,0.3)" }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View 2: Table Seating Chart Grid */}
      {viewMode === "chart" && (
        <div className="seating-chart-grid">
          {Object.entries(tablesMap).map(([tblName, seatedGuests]) => {
            const tableHeadcount = seatedGuests.reduce((sum, g) => sum + (g.party_size || 1), 0);
            return (
              <div key={tblName} className="seating-table-card">
                <div className="seating-table-header">
                  <span className="seating-table-title">🪑 {tblName}</span>
                  <span className="seating-table-capacity">{tableHeadcount} Seats Occupied</span>
                </div>

                <div className="seating-guest-list">
                  {seatedGuests.map((g) => (
                    <div key={g.id} className="seating-guest-chip">
                      <div>
                        <strong>{g.name || g.full_name}</strong>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {g.dietary && g.dietary !== "Standard" && <span>🥗 {g.dietary} • </span>}
                          Party of {g.party_size || 1}
                        </div>
                      </div>
                      <span className={`status-badge status-${g.rsvp_status}`} style={{ fontSize: "0.65rem" }}>
                        {g.rsvp_status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Tab View: Cost Variance & Payment Ledger (Aligned with Problem Statement)
   ========================================================================== */
function CostVarianceTab({ event, onRefreshEvent, showToast, triggerConfetti, onOpenAddExpense, onOpenPaymentModal }) {
  const items = event.budget_items || [];
  const vendors = event.vendors || [];
  const totalBudget = Number(event.total_budget || 0);

  // Financial aggregates
  const totalEstimated = items.reduce((sum, i) => sum + (Number(i.estimated_cost) || 0), 0);
  const totalActual = items.reduce((sum, i) => sum + (Number(i.actual_cost) || 0), 0);
  const effectiveExpense = totalActual > 0 ? totalActual : totalEstimated;
  const netVariance = totalEstimated - totalActual; // Positive = savings, Negative = overrun
  const totalPaid = items.filter((i) => i.paid).reduce((sum, i) => sum + (Number(i.actual_cost > 0 ? i.actual_cost : i.estimated_cost) || 0), 0);
  const unpaidBalance = Math.max(0, effectiveExpense - totalPaid);
  const paidPct = effectiveExpense > 0 ? Math.min(100, Math.round((totalPaid / effectiveExpense) * 100)) : 0;

  // Category breakdown calculation
  const categoryLedger = useMemo(() => {
    const cats = {};
    items.forEach((item) => {
      const c = item.category || "Miscellaneous & Contingency";
      if (!cats[c]) {
        cats[c] = { estimated: 0, actual: 0, count: 0, paidCount: 0 };
      }
      cats[c].estimated += Number(item.estimated_cost) || 0;
      cats[c].actual += Number(item.actual_cost) || 0;
      cats[c].count += 1;
      if (item.paid) cats[c].paidCount += 1;
    });

    return Object.entries(cats).map(([name, data]) => {
      const diff = data.estimated - data.actual;
      const isSavings = diff >= 0;
      const pctSpent = data.estimated > 0 ? Math.min(150, Math.round((data.actual / data.estimated) * 100)) : 0;
      return {
        name,
        estimated: data.estimated,
        actual: data.actual,
        count: data.count,
        paidCount: data.paidCount,
        diff,
        isSavings,
        pctSpent,
      };
    });
  }, [items]);

  // Settle vendor payment directly
  const handleSettleVendor = async (vendorId, vendorName) => {
    try {
      await API.updateVendorStatus(event.id, vendorId, "Fully Paid");
      await onRefreshEvent();
      showToast(`Payment settled in full for ${vendorName}!`, "success");
      triggerConfetti();
    } catch (err) {
      console.error("Settle vendor error:", err);
      showToast("Could not settle vendor payment.", "error");
    }
  };

  // Toggle individual budget line item payment
  const handleToggleBudgetItemPaid = async (itemId, itemName) => {
    try {
      await API.toggleBudgetItemPaid(event.id, itemId);
      await onRefreshEvent();
      showToast(`Updated payment status for ${itemName}!`, "success");
    } catch (err) {
      console.error("Toggle item paid error:", err);
      showToast("Failed to update line item payment.", "error");
    }
  };

  return (
    <div className="tab-pane-content">
      {/* Section Header */}
      <div className="section-header">
        <div className="section-title-group">
          <h2>Cost Variance & Financial Payment Ledger</h2>
          <p>
            Real-time Estimated vs. Actual cost difference analysis, category savings/overruns in Indian Rupees (₹), and 1-click vendor settlement ledger.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="btn btn-primary" onClick={onOpenAddExpense}>
            <span>➕</span> Add Expense Item
          </button>
        </div>
      </div>

      {/* 4 Glowing Financial KPI Cards */}
      <div className="budget-grid-metrics">
        <div className="metric-card">
          <div className="metric-card-label">TOTAL ESTIMATED BUDGET</div>
          <div className="metric-card-val" style={{ color: "#ffffff" }}>
            {formatINR(totalEstimated)}
          </div>
          <div className="metric-card-sub">
            Planned across {items.length} line items (Target: {formatINR(totalBudget)})
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-label">TOTAL ACTUAL / COMMITTED</div>
          <div className="metric-card-val" style={{ color: totalActual > totalEstimated ? "var(--accent-rose)" : "var(--accent-cyan)" }}>
            {formatINR(effectiveExpense)}
          </div>
          <div className="metric-card-sub">
            {totalActual > 0 ? "Invoiced & agreed contracts" : "Awaiting vendor invoices"}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-label">NET COST VARIANCE</div>
          <div
            className="metric-card-val"
            style={{ color: netVariance >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}
          >
            {netVariance >= 0 ? `-${formatINR(netVariance)}` : `+${formatINR(Math.abs(netVariance))}`}
          </div>
          <div className="metric-card-sub">
            {netVariance >= 0 ? (
              <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>🟢 Within Budget / Net Savings</span>
            ) : (
              <span style={{ color: "var(--accent-rose)", fontWeight: 700 }}>🔴 Overrun / Needs Trimming</span>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-label">PAYMENT SETTLEMENT</div>
          <div className="metric-card-val" style={{ color: "var(--accent-gold)" }}>
            {formatINR(totalPaid)} <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>/ {formatINR(unpaidBalance)} Due</span>
          </div>
          <div className="metric-card-sub" style={{ marginTop: "0.4rem" }}>
            <div className="progress-track">
              <div className="progress-fill progress-fill-emerald" style={{ width: `${paidPct}%` }}></div>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>
              {paidPct}% settled ({items.filter((i) => i.paid).length} of {items.length} items paid)
            </div>
          </div>
        </div>
      </div>

      {/* Category Comparative Breakdown with Progress Bars */}
      <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-xl)", marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#ffffff" }}>
              Category Estimated vs. Actual Variance Ledger
            </h3>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              Compare planned allocations with actual expenditure across all key celebration categories.
            </p>
          </div>
        </div>

        <div className="variance-category-grid">
          {categoryLedger.map((cat, idx) => (
            <div key={idx} className="variance-cat-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc" }}>{cat.name}</h4>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{cat.count} line items • {cat.paidCount} paid</div>
                </div>
                <span className={`status-badge ${cat.isSavings ? "status-paid" : "status-declined"}`}>
                  {cat.isSavings ? `✓ ${formatINR(cat.diff)} Saved` : `⚠️ +${formatINR(Math.abs(cat.diff))} Over`}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", margin: "0.75rem 0", fontSize: "0.85rem" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Estimated</div>
                  <div style={{ fontWeight: 700, color: "#ffffff" }}>{formatINR(cat.estimated)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Actual Spend</div>
                  <div style={{ fontWeight: 700, color: cat.actual > cat.estimated ? "var(--accent-rose)" : "var(--accent-cyan)" }}>
                    {cat.actual > 0 ? formatINR(cat.actual) : formatINR(cat.estimated)}
                  </div>
                </div>
              </div>

              <div className="progress-track" style={{ height: "6px" }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, cat.pctSpent)}%`,
                    background: cat.actual > cat.estimated ? "var(--accent-rose)" : "linear-gradient(90deg, var(--accent-emerald), var(--accent-cyan))",
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Payment Settlement Schedule */}
      <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-xl)", marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#ffffff" }}>
              Vendor Payment Settlement Schedule
            </h3>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              1-click settlement syncs vendor contracts directly with budget balances and completed tasks.
            </p>
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor / Company</th>
                <th>Category</th>
                <th>Quoted Amount</th>
                <th>Contract Status</th>
                <th>Payment Status</th>
                <th style={{ textAlign: "right" }}>Settlement Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    No vendors registered yet. Add vendors in the Vendor Directory to manage settlements.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => {
                  const quote = Number(v.quoted_price || v.quoted_cost || 0);
                  const isPaid = v.status === "Fully Paid";
                  const isDeposit = v.status === "Deposit Paid";
                  const paidAmount = isPaid ? quote : isDeposit ? Math.round(quote * 0.5) : 0;
                  const balanceDue = quote - paidAmount;

                  return (
                    <tr key={v.id}>
                      <td>
                        <strong>{v.name}</strong>
                        {(v.contact_name || v.contact_person) && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            👤 {v.contact_name || v.contact_person}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="card-category-badge" style={{ fontSize: "0.7rem" }}>{v.category}</span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--accent-gold)" }}>{formatINR(quote)}</strong>
                      </td>
                      <td>
                        <span className={`status-badge ${isPaid ? "status-paid" : isDeposit ? "status-confirmed" : "status-pending"}`}>
                          {v.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                          <span style={{ color: "var(--accent-emerald)" }}>{formatINR(paidAmount)}</span>
                          <span style={{ color: "var(--text-dim)", margin: "0 0.3rem" }}>/</span>
                          <span style={{ color: balanceDue > 0 ? "var(--accent-rose)" : "var(--text-muted)" }}>
                            {balanceDue > 0 ? `${formatINR(balanceDue)} Due` : "Settled"}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {!isPaid ? (
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              background: "linear-gradient(135deg, var(--accent-emerald), #059669)",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                              padding: "0.3rem 0.75rem",
                            }}
                            onClick={() => (onOpenPaymentModal ? onOpenPaymentModal(v, "vendor") : handleSettleVendor(v.id, v.name))}
                            title="Record payment amount and settle vendor contract"
                          >
                            💳 Settle In Full
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--accent-emerald)", fontWeight: 700 }}>
                            ✓ Fully Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Itemized Comparative Ledger Table */}
      <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-xl)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#ffffff" }}>
              Detailed Line-Item Variance Table
            </h3>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              Individual line items with estimated cost, actual invoice cost, difference delta, and interactive payment toggle.
            </p>
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Expense Item</th>
                <th>Category</th>
                <th>Estimated Cost</th>
                <th>Actual Cost</th>
                <th>Cost Variance (Diff)</th>
                <th>Payment Status</th>
                <th style={{ textAlign: "right" }}>Toggle Payment</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    No budget line items found.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const est = Number(item.estimated_cost || 0);
                  const act = Number(item.actual_cost || 0);
                  const diff = est - act;
                  const isSavings = diff >= 0;

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        {item.notes && <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{item.notes}</div>}
                      </td>
                      <td>
                        <span className="card-category-badge" style={{ fontSize: "0.7rem" }}>{item.category}</span>
                      </td>
                      <td>{formatINR(est)}</td>
                      <td>
                        <strong style={{ color: act > est ? "var(--accent-rose)" : "#ffffff" }}>
                          {act > 0 ? formatINR(act) : "-"}
                        </strong>
                      </td>
                      <td>
                        {act > 0 ? (
                          <span className={`status-badge ${isSavings ? "status-paid" : "status-declined"}`}>
                            {isSavings ? `-${formatINR(diff)} (Saved)` : `+${formatINR(Math.abs(diff))} (Over)`}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>Pending Invoice</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${item.paid ? "status-paid" : "status-pending"}`}>
                          {item.paid ? "✓ Paid" : "⏳ Pending"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${item.paid ? "btn-secondary" : "btn-gold"}`}
                          style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem" }}
                          onClick={() => (onOpenPaymentModal ? onOpenPaymentModal(item, "budget") : handleToggleBudgetItemPaid(item.id, item.name))}
                          title="Record payment amount or toggle status"
                        >
                          {item.paid ? "Paid (Edit)" : "Mark Paid ✓"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Tab View: Invitations & Speeches
   ========================================================================== */
function InvitationsTab({ event, onCopyText }) {
  const weddingText = `Together with their families\nSofia & Julian\nrequest the pleasure of your company\nat their wedding celebration\n\nSaturday, November 14, 2026\nat Villa Bella Vista & Gardens\nReception to follow.`;
  const casualText = `We're getting married!\n\nJoin Sofia & Julian for an evening of great food, live music, and dancing under the stars.\n\nNov 14, 2026 | Villa Bella Vista\nRSVP by Oct 15!`;
  const toastText = `Introduction (30s):\n"Welcome everyone! Seeing all our favorite people gathered in one room fills our hearts with immense gratitude."\n\nStory / Memory (1m 30s):\n"When Sofia and Julian first met at that coffee shop in Florence, neither realized a simple shared espresso would turn into a lifetime journey..."\n\nToast & Blessing (1m):\n"Here's to love that grows deeper with every year, laughter that fills every room, and a lifetime of adventures together. Please raise your glasses to Sofia & Julian!"`;

  return (
    <div>
      <div className="section-header">
        <div className="section-title-group">
          <h2>Invitation Copywriting & Toast Outlines</h2>
          <p>AI-crafted invitations across multiple tones and a complete 3-minute toast outline for the host.</p>
        </div>
      </div>

      <div className="invitation-grid">
        <div className="invitation-card">
          <div>
            <div className="invitation-tone">Formal & Traditional Tone</div>
            <div className="invitation-text">{weddingText}</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCopyText(weddingText, "Formal Invitation")}>
            📋 Copy Invitation Text
          </button>
        </div>

        <div className="invitation-card">
          <div>
            <div className="invitation-tone">Modern & Casual Tone</div>
            <div className="invitation-text">{casualText}</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCopyText(casualText, "Casual Invitation")}>
            📋 Copy Invitation Text
          </button>
        </div>

        <div className="invitation-card">
          <div>
            <div className="invitation-tone">3-Minute Host Toast Outline</div>
            <div className="invitation-text">{toastText}</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCopyText(toastText, "Toast Speech Outline")}>
            📋 Copy Toast Outline
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Tab View: GenAI Assistant Chat
   ========================================================================== */
function AIAssistantTab({ event, messages, input, setInput, onSend, isLoading }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const quickPrompts = [
    "How to save 15% on catering?",
    "Suggest a unique surprise entrance",
    "Rainy day backup plan checklist",
    "Best songs for celebration entrance",
  ];

  return (
    <div>
      <div className="section-header">
        <div className="section-title-group">
          <h2>GenAI Celebration Planning Assistant</h2>
          <p>Ask our AI expert for cost-saving suggestions, run-of-show logistics, and creative ideas.</p>
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-bubble ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}>
              <div style={{ whiteSpace: "pre-line" }}>{m.content}</div>
              {m.tips && m.tips.length > 0 && (
                <div style={{ marginTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.5rem" }}>
                  <strong style={{ color: "var(--accent-gold)", fontSize: "0.8rem" }}>Actionable Steps:</strong>
                  <ul style={{ paddingLeft: "1.2rem", marginTop: "0.3rem", fontSize: "0.8rem" }}>
                    {m.tips.map((tip, tIdx) => (
                      <li key={tIdx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="chat-bubble chat-bubble-ai" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span>✨ Analyzing event logistics and formulating custom advice...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-quick-prompts">
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", alignSelf: "center" }}>Suggested:</span>
          {quickPrompts.map((q, idx) => (
            <button key={idx} type="button" className="filter-chip" onClick={() => onSend(q)}>
              {q}
            </button>
          ))}
        </div>

        <form
          className="chat-input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
        >
          <input
            type="text"
            className="chat-input"
            placeholder="Ask anything (e.g. 'How can I save on floral arrangements?')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()}>
            Send 🚀
          </button>
        </form>
      </div>
    </div>
  );
}

/* ==========================================================================
   Modals: Create Event with Presets & Add Items
   ========================================================================== */
function NewEventModal({ onClose, onCreated, showToast }) {
  const [formData, setFormData] = useState({
    title: "",
    event_type: "wedding",
    total_budget: 2500000,
    guest_count: 150,
    date: "2026-11-20",
    location: "The Leela Palace & Royal Gardens, Udaipur",
    theme: "Royal Sunset & Marigold Silk Elegance",
    vibe: "Romantic, candle-lit, royal and timeless",
    generate_ai_plan: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Preset Templates in Indian Rupees (₹)
  const templates = [
    {
      label: "💍 Royal Wedding",
      title: "Elegance & Blooms: Sofia & Julian's Wedding",
      type: "wedding",
      budget: 2800000,
      guests: 150,
      location: "The Leela Palace, Udaipur",
      theme: "Royal Sunset & Marigold Silk Elegance",
      vibe: "Romantic, candle-lit, royal, and timeless",
    },
    {
      label: "🎂 Neon 30th Birthday",
      title: "Marcus's Electric Neon 30th Birthday Bash",
      type: "birthday",
      budget: 350000,
      guests: 50,
      location: "Skyline Penthouse Lounge, Bengaluru",
      theme: "Neon Noir & Retro Cyber Lounge",
      vibe: "High energy, playful, neon glow, upbeat music",
    },
    {
      label: "🎪 Community Harvest",
      title: "Greenwood Park Annual Harvest Festival",
      type: "community",
      budget: 850000,
      guests: 350,
      location: "Greenwood Community Grounds & Amphitheatre",
      theme: "Harmony Harvest & Neighborhood Unity Fair",
      vibe: "Family-friendly, welcoming, vibrant, joyful",
    },
    {
      label: "🥂 Golden Jubilee",
      title: "Golden Horizons: 50th Jubilee Celebration",
      type: "anniversary",
      budget: 1200000,
      guests: 100,
      location: "Grand Crystal Heritage Ballroom",
      theme: "Champagne Elegance & 50 Years of Memories",
      vibe: "Sophisticated, nostalgic, and joyous",
    },
  ];

  const applyTemplate = (t) => {
    setFormData((prev) => ({
      ...prev,
      title: t.title,
      event_type: t.type,
      total_budget: t.budget,
      guest_count: t.guests,
      location: t.location,
      theme: t.theme,
      vibe: t.vibe,
    }));
    showToast(`Loaded preset: ${t.label}!`, "info");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("Please enter a celebration title.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await API.createEvent(formData);
      onCreated(created);
    } catch (err) {
      console.error("Create event error:", err);
      showToast("Failed to create event. Please check inputs.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Celebration</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Template Presets */}
            <div>
              <span className="form-label" style={{ display: "block", marginBottom: "0.4rem" }}>
                ⚡ Quick Start with Curated Templates:
              </span>
              <div className="template-chips-grid">
                {templates.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="template-chip"
                    onClick={() => applyTemplate(t)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Celebration Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Liam & Emma's Royal Wedding"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Event Type</label>
                <select
                  className="form-select"
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                >
                  <option value="wedding">💍 Wedding</option>
                  <option value="birthday">🎂 Birthday</option>
                  <option value="community">🎪 Community Event</option>
                  <option value="anniversary">🥂 Anniversary</option>
                  <option value="corporate">🏢 Corporate Gala</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Budget (₹ INR)</label>
                <input
                  type="number"
                  className="form-input"
                  min="50000"
                  step="10000"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: Number(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Expected Guest Count</label>
                <input
                  type="number"
                  className="form-input"
                  min="5"
                  value={formData.guest_count}
                  onChange={(e) => setFormData({ ...formData, guest_count: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Celebration Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Venue / Location</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Villa Bella Vista & Gardens"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Theme & Vibe</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Midnight Stars & Velvet Romance"
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                type="checkbox"
                id="genai-toggle"
                checked={formData.generate_ai_plan}
                onChange={(e) => setFormData({ ...formData, generate_ai_plan: e.target.checked })}
                style={{ width: "18px", height: "18px", accentColor: "var(--accent-rose)" }}
              />
              <label htmlFor="genai-toggle" style={{ fontSize: "0.85rem", color: "#f8fafc", cursor: "pointer" }}>
                ✨ <strong>Auto-generate complete AI bundle</strong> (3D flip cards, budgets, schedules, vendors, seating, colors)
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Generating AI Celebration..." : "Create Celebration 🚀"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddExpenseModal({ eventId, onClose, onAdded, showToast }) {
  const [formData, setFormData] = useState({
    name: "",
    category: "Venue & Rentals",
    estimated_cost: 35000,
    actual_cost: 0,
    paid: false,
    notes: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await API.addBudgetItem(eventId, formData);
      onAdded();
    } catch (err) {
      console.error("Add expense error:", err);
      showToast("Could not add expense.", "error");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Budget Expense Item</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Expense Description *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Floral Centerpieces & Arch"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Venue & Rentals">Venue & Rentals</option>
                <option value="Catering & Bar">Catering & Bar</option>
                <option value="Decor & Floral">Decor & Floral</option>
                <option value="Entertainment & Music">Entertainment & Music</option>
                <option value="Photography & Video">Photography & Video</option>
                <option value="Attire & Styling">Attire & Styling</option>
                <option value="Invitations & Favors">Invitations & Favors</option>
                <option value="Miscellaneous & Contingency">Miscellaneous & Contingency</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Estimated Cost (₹ INR)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Actual Cost (₹ INR)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={formData.actual_cost}
                  onChange={(e) => setFormData({ ...formData, actual_cost: Number(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                id="paid-toggle"
                checked={formData.paid}
                onChange={(e) => setFormData({ ...formData, paid: e.target.checked })}
                style={{ width: "18px", height: "18px", accentColor: "var(--accent-emerald)" }}
              />
              <label htmlFor="paid-toggle" style={{ fontSize: "0.85rem", color: "#f8fafc", cursor: "pointer" }}>
                Already paid in full
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Expense</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTimelineModal({ eventId, onClose, onAdded, showToast }) {
  const [formData, setFormData] = useState({
    title: "",
    time_or_offset: "10:00 AM",
    phase: "day_of",
    owner: "Host",
    notes: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      await API.addTimelineItem(eventId, formData);
      onAdded();
    } catch (err) {
      console.error("Add milestone error:", err);
      showToast("Could not add schedule item.", "error");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Schedule Milestone</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Milestone Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Grand Entrance & Welcome Toast"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Time / Offset</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., 06:30 PM or 3 Weeks Before"
                  value={formData.time_or_offset}
                  onChange={(e) => setFormData({ ...formData, time_or_offset: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phase</label>
                <select
                  className="form-select"
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                >
                  <option value="pre_event">Pre-Planning (Weeks Before)</option>
                  <option value="week_of">Week-Of Final Prep</option>
                  <option value="day_of">Day-Of Run-of-Show</option>
                  <option value="post_event">Post-Event Wrap</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Lead / Owner</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Best Man, Wedding Planner, DJ"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Milestone</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddVendorModal({ eventId, onClose, onAdded, showToast }) {
  const [formData, setFormData] = useState({
    name: "",
    category: "Catering",
    contact_name: "",
    email: "",
    phone: "",
    quoted_price: 75000,
    status: "Quote Received",
    checklist_tasks: [
      "Review contract deliverables",
      "Confirm power and setup requirements",
      "Verify delivery timing and arrival schedule",
    ],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await API.addVendor(eventId, formData);
      onAdded();
    } catch (err) {
      console.error("Add vendor error:", err);
      showToast("Could not add vendor.", "error");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Event Vendor</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Vendor Company / Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Lumière Wedding Studios"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Photography, Catering, Florist"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quoted Cost (₹ INR)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={formData.quoted_price}
                  onChange={(e) => setFormData({ ...formData, quoted_price: Number(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Sarah Jenkins"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Researching">Researching</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Quote Received">Quote Received</option>
                  <option value="Contract Signed">Contract Signed</option>
                  <option value="Deposit Paid">Deposit Paid</option>
                  <option value="Fully Paid">Fully Paid</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g., contact@studio.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g., +1 (555) 234-5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Vendor</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddGuestModal({ eventId, onClose, onAdded, showToast }) {
  const [formData, setFormData] = useState({
    name: "",
    party_size: 1,
    rsvp_status: "pending",
    table_number: 1,
    dietary: "Standard",
    email_or_phone: "",
    notes: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await API.addGuest(eventId, formData);
      onAdded();
    } catch (err) {
      console.error("Add guest error:", err);
      showToast("Could not add guest.", "error");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Guest to Roster</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Guest / Family Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Eleanor Vance & Guest"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Party Size (Seats Needed)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="10"
                  value={formData.party_size}
                  onChange={(e) => setFormData({ ...formData, party_size: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">RSVP Status</label>
                <select
                  className="form-select"
                  value={formData.rsvp_status}
                  onChange={(e) => setFormData({ ...formData, rsvp_status: e.target.value })}
                >
                  <option value="pending">⏳ Pending Response</option>
                  <option value="confirmed">✓ Confirmed Attending</option>
                  <option value="declined">✕ Declined</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Table Number (1 to 50)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="50"
                  value={formData.table_number || ""}
                  onChange={(e) => setFormData({ ...formData, table_number: e.target.value ? Number(e.target.value) : null })}
                  placeholder="e.g. 1"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dietary Preference</label>
                <select
                  className="form-select"
                  value={formData.dietary}
                  onChange={(e) => setFormData({ ...formData, dietary: e.target.value })}
                >
                  <option value="Standard">Standard Meal</option>
                  <option value="Vegetarian">🥗 Vegetarian</option>
                  <option value="Vegan">🌱 Vegan</option>
                  <option value="Gluten-Free">🌾 Gluten-Free</option>
                  <option value="Halal">🍖 Halal</option>
                  <option value="Kosher">✡️ Kosher</option>
                  <option value="Nut Allergy">🥜 Nut Allergy</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email or Phone</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., eleanor@example.com"
                value={formData.email_or_phone}
                onChange={(e) => setFormData({ ...formData, email_or_phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes (e.g. relation, seating requests)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Aunt of Bride, VIP Seating"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Guest</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==========================================================================
   RecordPaymentModal: Interactive Modal for Actual Spend & Cost Variance Tracking
   ========================================================================== */
function RecordPaymentModal({ eventId, item, type = "budget", onClose, onRecorded, showToast }) {
  const isVendor = type === "vendor";
  const estimatedCost = isVendor
    ? Number(item.quoted_price || item.quoted_cost || 0)
    : Number(item.estimated_cost || 0);

  const initialActual = isVendor
    ? Number(item.actual_paid || (item.status === "Fully Paid" ? (item.quoted_price || item.quoted_cost) : 0))
    : Number(item.actual_cost || 0);

  const isAlreadyPaid = isVendor ? item.status === "Fully Paid" : Boolean(item.paid);

  const [actualAmount, setActualAmount] = useState(
    initialActual > 0 ? initialActual : estimatedCost
  );
  const [notes, setNotes] = useState(item.notes || "");
  const [submitting, setSubmitting] = useState(false);

  const numActual = Number(actualAmount) || 0;
  // Cost Variance = Estimated - Actual (Positive = Net Savings/Profit, Negative = Overrun/Loss)
  const variance = estimatedCost - numActual;
  const isSavings = variance >= 0;
  const pctVariance = estimatedCost > 0 ? Math.round((Math.abs(variance) / estimatedCost) * 100) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numActual < 0) {
      showToast("Payment amount cannot be negative.", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (isVendor) {
        await API.settleVendorPayment(eventId, item.id, {
          actual_paid: numActual,
          notes: notes.trim() || undefined,
        });
        showToast(`Vendor contract settled for ${formatINR(numActual)}!`, "success");
      } else {
        await API.recordBudgetPayment(eventId, item.id, {
          actual_cost: numActual,
          paid: true,
          notes: notes.trim() || undefined,
        });
        showToast(`Expense recorded as paid: ${formatINR(numActual)}!`, "success");
      }
      onRecorded();
    } catch (err) {
      console.error("Payment recording error:", err);
      showToast("Failed to record payment transaction.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkUnpaid = async () => {
    setSubmitting(true);
    try {
      if (isVendor) {
        await API.updateVendorStatus(eventId, item.id, "Pending");
        showToast(`Vendor marked as pending payment.`, "info");
      } else {
        await API.recordBudgetPayment(eventId, item.id, {
          actual_cost: 0,
          paid: false,
          notes: notes.trim() || undefined,
        });
        showToast(`Expense marked as unpaid.`, "info");
      }
      onRecorded();
    } catch (err) {
      console.error("Mark unpaid error:", err);
      showToast("Failed to update status to unpaid.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
        <div className="modal-header">
          <div>
            <h3 id="payment-modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>💳</span> Record Actual Payment & Settle
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Track the exact amount spent to maintain accurate profit/savings variance vs. original estimates.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close dialog">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Target Item Summary Card */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-glass)",
                borderRadius: "var(--radius-lg)",
                padding: "1rem",
                marginBottom: "1.25rem",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div>
                <span className="card-category-badge" style={{ fontSize: "0.7rem", marginBottom: "0.35rem", display: "inline-block" }}>
                  {item.category || "Celebration Expense"}
                </span>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  {item.name}
                </h4>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  {isVendor ? `Vendor Partner • Status: ${item.status}` : `Budget Line Item • Status: ${isAlreadyPaid ? "Paid" : "Pending"}`}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Original Estimate
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent-gold)" }}>
                  {formatINR(estimatedCost)}
                </div>
              </div>
            </div>

            {/* Actual Amount Input */}
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Actual Amount Spent (₹ INR) *</span>
                <span style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", fontWeight: 500 }}>
                  Currency: Indian Rupees (₹)
                </span>
              </label>
              <input
                type="number"
                className="form-input"
                style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.5px" }}
                min="0"
                step="any"
                placeholder="0"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Quick Adjustment Shortcuts */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase" }}>
                Quick Presets / Negotiated Discounts:
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem" }}
                  onClick={() => setActualAmount(estimatedCost)}
                >
                  Exact Match ({formatINR(estimatedCost)})
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem", borderColor: "rgba(16, 185, 129, 0.4)", color: "var(--accent-emerald)" }}
                  onClick={() => setActualAmount(Math.round(estimatedCost * 0.95))}
                >
                  -5% Savings ({formatINR(Math.round(estimatedCost * 0.95))})
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem", borderColor: "rgba(16, 185, 129, 0.4)", color: "var(--accent-emerald)" }}
                  onClick={() => setActualAmount(Math.round(estimatedCost * 0.90))}
                >
                  -10% Savings ({formatINR(Math.round(estimatedCost * 0.90))})
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem", borderColor: "rgba(244, 63, 94, 0.4)", color: "var(--accent-rose)" }}
                  onClick={() => setActualAmount(Math.round(estimatedCost * 1.10))}
                >
                  +10% Overrun ({formatINR(Math.round(estimatedCost * 1.10))})
                </button>
              </div>
            </div>

            {/* Live Real-Time Cost Variance & Profit/Loss Preview Box */}
            <div
              style={{
                borderRadius: "var(--radius-lg)",
                padding: "0.9rem 1.1rem",
                marginBottom: "1.25rem",
                border: isSavings
                  ? "1px solid rgba(16, 185, 129, 0.35)"
                  : "1px solid rgba(244, 63, 94, 0.35)",
                background: isSavings
                  ? "rgba(16, 185, 129, 0.08)"
                  : "rgba(244, 63, 94, 0.08)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: isSavings ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                  {variance === 0 ? "⚪ Exact Target Match" : isSavings ? "🟢 Net Savings / Profit Delta" : "🔴 Cost Overrun / Loss Delta"}
                </span>
                <span style={{ fontSize: "1.05rem", fontWeight: 800, color: isSavings ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                  {variance >= 0 ? `-${formatINR(variance)}` : `+${formatINR(Math.abs(variance))}`}
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                {variance === 0
                  ? "The actual payment exactly matches the initial budget allocation."
                  : isSavings
                  ? `You achieved ₹${formatINR(variance)} savings (${pctVariance}% below estimation). Profit retained in celebration reserve.`
                  : `Expense exceeds estimate by ₹${formatINR(Math.abs(variance))} (${pctVariance}% overrun). Deficit accounted in real-time variance ledger.`}
              </div>
            </div>

            {/* Payment Notes & Reference */}
            <div className="form-group">
              <label className="form-label">Payment Reference & Notes (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Paid via UPI / GPay / NetBanking • Final Settlement"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              {isAlreadyPaid && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ color: "var(--accent-rose)", borderColor: "rgba(244, 63, 94, 0.3)" }}
                  onClick={handleMarkUnpaid}
                  disabled={submitting}
                >
                  ↩ Mark as Unpaid
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  background: "linear-gradient(135deg, var(--accent-emerald), #059669)",
                  boxShadow: "0 0 15px rgba(16, 185, 129, 0.35)",
                }}
                disabled={submitting}
              >
                {submitting ? "Processing..." : `Confirm Payment (${formatINR(numActual)})`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Mount React Root
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}

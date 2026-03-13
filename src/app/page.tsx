"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VideoPlayer from "@/components/VideoPlayer";
import ReactionBar from "@/components/ReactionBar";
import HostCameraLayer from "@/components/HostCameraLayer";
import ConversationCardOverlay from "@/components/ConversationCardOverlay";
import ChatPanel from "@/components/ChatPanel";
import CinemaCurtains from "@/components/CinemaCurtains";
import IcebreakerFlow from "@/components/IcebreakerFlow";
import ScreeningCards from "@/components/ScreeningCards";
import PresenceCounter from "@/components/PresenceCounter";
import ThemeToggle from "@/components/ThemeToggle";
import HostControlsPanel from "@/components/HostControlsPanel";
import type { SyncState, ConversationCard, HostLayout, ReactionEmoji } from "@/lib/types";
import { getViewerId } from "@/lib/viewer";

const DEMO_EVENT_ID = "demo-event";
const DEFAULT_COUNTDOWN = 900; // 15 minutes (5 min questions + 10 min conversation cards)

export default function Room() {
  const [eventId] = useState(DEMO_EVENT_ID);
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<string>("waiting");
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [activeCard, setActiveCard] = useState<ConversationCard | null>(null);
  const [hostLayout, setHostLayout] = useState<HostLayout>("pip");
  const [hostVisible, setHostVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [chatOpen, setChatOpen] = useState(true); // Chat open by default
  const [curtainsOpen, setCurtainsOpen] = useState(false);
  const [icebreakerComplete, setIcebreakerComplete] = useState(false);
  const [countdownStart, setCountdownStart] = useState<number | null>(null);
  const [countdownDuration, setCountdownDuration] = useState(DEFAULT_COUNTDOWN);
  const [hostPanelOpen, setHostPanelOpen] = useState(true); // Everyone is a host for now
  const [arrived, setArrived] = useState(false); // tracks curtain reveal
  const shownCardIds = useRef<Set<string>>(new Set());
  const autoStartedRef = useRef(false);

  const viewerId = typeof window !== "undefined" ? getViewerId() : "";

  // ─── Poll sync state ───
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/sync?event_id=${eventId}`);
      const data = await res.json();
      if (data.sync) setSyncState(data.sync);
      if (data.event_status) setEventStatus(data.event_status);
      if (data.host_layout) setHostLayout(data.host_layout);
      if (data.host_visible !== undefined) setHostVisible(data.host_visible);
      if (data.countdown_start) setCountdownStart(data.countdown_start);
      if (data.countdown_duration) setCountdownDuration(data.countdown_duration);
      if (data.curtains_open !== undefined) setCurtainsOpen(data.curtains_open);
    } catch { /* ignore */ }
  }, [eventId]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [poll]);

  // ─── Fetch event info (playback ID) ───
  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch("/api/event");
        const data = await res.json();
        if (data.event) {
          setPlaybackId(data.event.mux_playback_id);
        }
      } catch { /* demo mode */ }
    }
    loadEvent();
  }, []);

  // ─── Auto-start countdown when page loads ───
  // If event is still "waiting", auto-trigger countdown so the 5-min
  // timer starts immediately for the icebreaker experience
  useEffect(() => {
    if (eventStatus === "waiting" && !autoStartedRef.current) {
      autoStartedRef.current = true;
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          event_status: "countdown",
          countdown_duration: DEFAULT_COUNTDOWN,
        }),
      }).then(() => poll()).catch(() => {});
    }
  }, [eventStatus, eventId, poll]);

  // ─── Auto-open curtains on arrive (brief dramatic delay) ───
  useEffect(() => {
    if (arrived) return;
    // Brief 1.5s delay for dramatic reveal, then open curtains
    const timer = setTimeout(() => {
      setArrived(true);
      setCurtainsOpen(true);
      // Also tell the server curtains are open
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, curtains_open: true }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [arrived, eventId]);

  // ─── Late joiner: skip icebreaker only if event was already live on first load ───
  const initialStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialStatusRef.current === null && eventStatus !== "waiting") {
      initialStatusRef.current = eventStatus;
    }
    // Only skip icebreaker if the event was already live/ended when we FIRST loaded
    if (initialStatusRef.current === "live" || initialStatusRef.current === "ended") {
      setIcebreakerComplete(true);
    }
  }, [eventStatus]);

  // ─── Auto-go-live when icebreaker completes ───
  const handleIcebreakerComplete = useCallback(() => {
    setIcebreakerComplete(true);

    // If countdown is still running, the curtains text shows "enjoy the show"
    // When countdown finishes, auto-go-live triggers below
    // If countdown already finished, go live now
    if (countdownStart) {
      const elapsed = (Date.now() - countdownStart) / 1000;
      if (elapsed >= countdownDuration) {
        // Countdown already done, go live immediately
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: eventId, event_status: "live" }),
        }).then(() => {
          return fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_id: eventId, action: "play" }),
          });
        }).then(() => poll()).catch(() => {});
      }
    }
  }, [eventId, countdownStart, countdownDuration, poll]);

  // ─── Auto-go-live when countdown finishes (if icebreaker is done) ───
  useEffect(() => {
    if (!countdownStart || !icebreakerComplete || eventStatus === "live" || eventStatus === "ended") return;

    const checkCountdown = () => {
      const elapsed = (Date.now() - countdownStart) / 1000;
      if (elapsed >= countdownDuration) {
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: eventId, event_status: "live" }),
        }).then(() => {
          return fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_id: eventId, action: "play" }),
          });
        }).then(() => poll()).catch(() => {});
        return true;
      }
      return false;
    };

    if (checkCountdown()) return;
    const interval = setInterval(() => {
      if (checkCountdown()) clearInterval(interval);
    }, 500);
    return () => clearInterval(interval);
  }, [countdownStart, countdownDuration, icebreakerComplete, eventStatus, eventId, poll]);

  // ─── Check for conversation cards ───
  useEffect(() => {
    async function checkCards() {
      try {
        const res = await fetch(
          `/api/cards?event_id=${eventId}&current_time=${Math.floor(currentTime)}`
        );
        const data = await res.json();
        if (data.card && !shownCardIds.current.has(data.card.id)) {
          shownCardIds.current.add(data.card.id);
          setActiveCard(data.card);
        }
      } catch { /* ignore */ }
    }
    if (currentTime > 0) checkCards();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(currentTime / 5), eventId]);

  // ─── Host controls keyboard shortcut (backtick) ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "`" && !e.ctrlKey && !e.metaKey) {
        // Don't trigger if user is typing in an input
        if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
        e.preventDefault();
        setHostPanelOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleReaction = useCallback((emoji: ReactionEmoji) => {
    fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, viewer_id: viewerId, emoji }),
    }).catch(() => {});
  }, [eventId, viewerId]);

  const handleCardRespond = useCallback((cardId: string, value: string) => {
    fetch("/api/cards/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: cardId, event_id: eventId, viewer_id: viewerId, response_value: value }),
    }).catch(() => {});
  }, [eventId, viewerId]);

  const handleCardDismiss = useCallback(() => {
    setActiveCard(null);
  }, []);

  return (
    <main className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--room-bg)]">
      {/* Cinema Curtains — only during screening room transition */}
      {icebreakerComplete && <CinemaCurtains isOpen={curtainsOpen} />}

      {/* Spotlight reveal overlay */}
      <AnimatePresence>
        {arrived && !icebreakerComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            transition={{ duration: 1.5, delay: 0.3 }}
            className="fixed inset-0 z-[50] pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 70% at center, transparent 0%, rgba(5,5,5,0.6) 60%, rgba(2,2,2,0.85) 100%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── Top Bar ─── */}
      <header className="flex items-center justify-between px-5 py-3 flex-shrink-0 bg-[var(--room-bg)] border-b border-[var(--room-border)] z-[40]">
        <div className="flex items-center gap-3">
          <span className="text-xs tracking-[0.15em] uppercase text-[var(--room-accent)] font-semibold">
            FlightStory
          </span>
          {eventStatus === "live" && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-white/60" style={{ animation: "pulse-dot 1.5s infinite" }} />
              <span className="text-[11px] text-white/60 font-medium tracking-wider">LIVE</span>
            </div>
          )}
          {eventStatus === "countdown" && (
            <span className="text-xs text-[var(--room-gold)]">Pre-show</span>
          )}
          {eventStatus === "waiting" && (
            <span className="text-xs text-[var(--room-text-muted)]">Starting...</span>
          )}
          {eventStatus === "ended" && (
            <span className="text-xs text-[var(--room-text-muted)]">Ended</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <PresenceCounter eventId={eventId} />
          <ThemeToggle />
          {/* Camera toggle — everyone can go on stage */}
          {icebreakerComplete && (
            <button
              onClick={() => setHostVisible(!hostVisible)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                hostVisible
                  ? "bg-[var(--room-green)] text-white"
                  : "bg-[var(--room-surface)] text-[var(--room-text-muted)] hover:text-[var(--room-text)]"
              }`}
              title={hostVisible ? "Turn off camera" : "Go on stage"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              chatOpen
                ? "bg-[var(--room-accent)] text-white"
                : "bg-[var(--room-surface)] text-[var(--room-text-muted)] hover:text-[var(--room-text)]"
            }`}
            title="Toggle Chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          {/* Host controls toggle */}
          <button
            onClick={() => setHostPanelOpen(!hostPanelOpen)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              hostPanelOpen
                ? "bg-[var(--room-accent)] text-white"
                : "bg-[var(--room-surface)] text-[var(--room-text-muted)] hover:text-[var(--room-text)]"
            }`}
            title="Host Controls (`)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <div className="flex flex-col flex-1 min-h-0">
        {!icebreakerComplete ? (
          /* ─── Pre-show: Community Segmentation ─── */
          <div className="flex flex-1 min-h-0">
            {/* Center: segmentation flow */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
              <IcebreakerFlow
                eventId={eventId}
                viewerId={viewerId}
                countdownStart={countdownStart}
                countdownDuration={countdownDuration}
                onComplete={handleIcebreakerComplete}
              />
            </div>
            {/* Right: Chat (always available) */}
            <AnimatePresence>
              {chatOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 384, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="flex-shrink-0 border-l border-[var(--room-border)] flex flex-col bg-[var(--room-bg)] overflow-hidden"
                >
                  <ChatPanel eventId={eventId} isOpen={true} onToggle={() => setChatOpen(false)} inline />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* ─── Screening Room: Video top, Cards left + Chat right below ─── */
          <>
            {/* Video area */}
            <div className="flex-shrink-0 p-4 pb-0">
              <div className="relative">
                <VideoPlayer
                  playbackId={playbackId}
                  syncState={syncState}
                  onTimeUpdate={setCurrentTime}
                />
                {hostLayout === "pip" && (
                  <HostCameraLayer layout="pip" visible={hostVisible} />
                )}
                <ReactionBar onReaction={handleReaction} />
              </div>
            </div>

            {/* Below video: Cards (left) + Chat (right) */}
            <div className="flex flex-1 min-h-0">
              {/* Left: Conversation Cards */}
              <div className="flex-1 min-w-0 border-r border-[var(--room-border)]">
                <ScreeningCards
                  eventId={eventId}
                  viewerId={viewerId}
                />
              </div>

              {/* Right: Chat */}
              <AnimatePresence>
                {chatOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 384, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="flex-shrink-0 flex flex-col bg-[var(--room-bg)] overflow-hidden"
                  >
                    <ChatPanel eventId={eventId} isOpen={true} onToggle={() => setChatOpen(false)} inline />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Host side panel */}
              {hostLayout === "side" && hostVisible && (
                <div className="w-80 lg:w-96 flex-shrink-0 border-l border-[var(--room-border)] flex flex-col bg-[var(--room-bg)] p-3">
                  <HostCameraLayer layout="side" visible={true} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Conversation Card Overlay (legacy server-triggered cards) */}
      <ConversationCardOverlay
        card={activeCard}
        onRespond={handleCardRespond}
        onDismiss={handleCardDismiss}
      />

      {/* Host Controls Panel (collapsible) */}
      <HostControlsPanel
        eventId={eventId}
        isOpen={hostPanelOpen}
        onToggle={() => setHostPanelOpen(!hostPanelOpen)}
        eventStatus={eventStatus}
        curtainsOpen={curtainsOpen}
        hostLayout={hostLayout}
        hostVisible={hostVisible}
        onSyncUpdate={poll}
      />
    </main>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import ReactionBar from "@/components/ReactionBar";
import HostCameraLayer from "@/components/HostCameraLayer";
import ConversationCardOverlay from "@/components/ConversationCardOverlay";
import QAPanel from "@/components/QAPanel";
import PresenceCounter from "@/components/PresenceCounter";
import type { SyncState, ConversationCard, HostLayout, ReactionEmoji } from "@/lib/types";
import { getViewerId } from "@/lib/viewer";

interface FloatingReaction {
  id: number;
  emoji: string;
  x: number;
}

const DEMO_EVENT_ID = "demo-event";

export default function Room() {
  const [eventId] = useState(DEMO_EVENT_ID);
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<string>("live");
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [activeCard, setActiveCard] = useState<ConversationCard | null>(null);
  const [hostLayout, setHostLayout] = useState<HostLayout>("pip");
  const [hostVisible, setHostVisible] = useState(true);
  const [incomingReactions, setIncomingReactions] = useState<FloatingReaction[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const reactionIdRef = useRef(0);
  const shownCardIds = useRef<Set<string>>(new Set());

  const viewerId = typeof window !== "undefined" ? getViewerId() : "";

  // Fetch event info
  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch("/api/event");
        const data = await res.json();
        if (data.event) {
          setPlaybackId(data.event.mux_playback_id);
          setEventStatus(data.event.status);
        }
      } catch { /* demo mode */ }
    }
    loadEvent();
  }, []);

  // Poll sync state every 5s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/sync?event_id=${eventId}`);
        const data = await res.json();
        if (data.sync) setSyncState(data.sync);
        if (data.event_status) setEventStatus(data.event_status);
        if (data.host_layout) setHostLayout(data.host_layout);
        if (data.host_visible !== undefined) setHostVisible(data.host_visible);
      } catch { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Check for conversation cards based on playback time
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

  // Simulate incoming reactions from other viewers (demo)
  useEffect(() => {
    const interval = setInterval(() => {
      if (eventStatus !== "live") return;
      if (Math.random() < 0.3) {
        const emojis = ["🔥", "❤️", "🤯", "😂", "👏"];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const id = reactionIdRef.current++;
        const x = 10 + Math.random() * 80;
        setIncomingReactions((prev) => [...prev, { id, emoji, x }]);
        setTimeout(() => {
          setIncomingReactions((prev) => prev.filter((r) => r.id !== id));
        }, 2000);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [eventStatus]);

  // Demo: trigger a conversation card preview after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!activeCard) {
        setActiveCard({
          id: "preview-card",
          event_id: DEMO_EVENT_ID,
          type: "card",
          trigger_time_seconds: 0,
          prompt_text: "What moment in this episode resonated with you most?",
          options: null,
          response_type: "text",
          auto_dismiss_seconds: 30,
          show_results: false,
          is_active: true,
          sort_order: 0,
        });
      }
    }, 8000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="h-screen w-screen flex flex-col overflow-hidden">
      {/* ─── Top Bar ─── */}
      <header className="flex items-center justify-between px-5 py-3 flex-shrink-0 bg-[var(--room-bg)] border-b border-[var(--room-border)]">
        <div className="flex items-center gap-3">
          <span className="text-xs tracking-[0.15em] uppercase text-[var(--room-accent)] font-semibold">
            BTD Screening
          </span>
          {eventStatus === "live" && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: "pulse-dot 1.5s infinite" }} />
              <span className="text-[11px] text-red-400 font-medium">LIVE</span>
            </div>
          )}
          {eventStatus === "waiting" && (
            <span className="text-xs text-[var(--room-text-muted)]">Waiting to start</span>
          )}
          {eventStatus === "ended" && (
            <span className="text-xs text-[var(--room-text-muted)]">Ended</span>
          )}
          <span className="text-[10px] text-[var(--room-text-muted)] border border-[var(--room-border)] rounded px-2 py-0.5">
            Viewer Preview
          </span>
        </div>
        <PresenceCounter eventId={eventId} />
      </header>

      {/* ─── Main Content ─── */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Video + Reactions (~70-75%) */}
        <div className="flex-1 flex flex-col p-4 min-w-0">
          <div className="relative flex-1 min-h-0">
            <VideoPlayer
              playbackId={playbackId}
              syncState={syncState}
              onTimeUpdate={setCurrentTime}
            />
            {/* Host PiP overlay */}
            {hostLayout === "pip" && (
              <HostCameraLayer layout="pip" visible={hostVisible} />
            )}
            {/* Floating reactions */}
            <ReactionBar
              onReaction={handleReaction}
              incomingReactions={incomingReactions}
            />
          </div>
        </div>

        {/* Right: Host side panel + Q&A (~25-30%) */}
        <div className="w-80 lg:w-96 flex-shrink-0 border-l border-[var(--room-border)] flex flex-col bg-[var(--room-bg)]">
          {/* Host camera in side panel mode */}
          {hostLayout === "side" && hostVisible && (
            <div className="p-3 border-b border-[var(--room-border)]">
              <HostCameraLayer layout="side" visible={true} />
            </div>
          )}
          {/* Q&A Panel */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <QAPanel eventId={eventId} />
          </div>
        </div>
      </div>

      {/* ─── Conversation Card Overlay ─── */}
      <ConversationCardOverlay
        card={activeCard}
        onRespond={handleCardRespond}
        onDismiss={handleCardDismiss}
      />
    </main>
  );
}

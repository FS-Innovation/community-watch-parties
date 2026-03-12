"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import ReactionBar from "@/components/ReactionBar";
import HostCameraLayer from "@/components/HostCameraLayer";
import ConversationCardOverlay from "@/components/ConversationCardOverlay";
import ChatPanel from "@/components/ChatPanel";
import CinemaCurtains from "@/components/CinemaCurtains";
import PresenceCounter from "@/components/PresenceCounter";
import type { SyncState, ConversationCard, HostLayout, ReactionEmoji } from "@/lib/types";
import { getViewerId } from "@/lib/viewer";

const DEMO_EVENT_ID = "demo-event";

export default function Room() {
  const [eventId] = useState(DEMO_EVENT_ID);
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<string>("waiting");
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [activeCard, setActiveCard] = useState<ConversationCard | null>(null);
  const [hostLayout, setHostLayout] = useState<HostLayout>("pip");
  const [hostVisible, setHostVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [curtainsOpen, setCurtainsOpen] = useState(false);
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

  // Open curtains when event goes live
  useEffect(() => {
    if (eventStatus === "live" && !curtainsOpen) {
      setCurtainsOpen(true);
    }
  }, [eventStatus, curtainsOpen]);

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

  return (
    <main className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--room-bg)]">
      {/* Cinema Curtains */}
      <CinemaCurtains isOpen={curtainsOpen} />

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
        </div>
        <PresenceCounter eventId={eventId} />
      </header>

      {/* ─── Main Content ─── */}
      <div className="flex flex-1 min-h-0">
        {/* Video + Reactions (full width, cinema-style) */}
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
            {/* Reactions */}
            <ReactionBar onReaction={handleReaction} />
          </div>
        </div>

        {/* Host side panel (only when in side layout) */}
        {hostLayout === "side" && hostVisible && (
          <div className="w-80 lg:w-96 flex-shrink-0 border-l border-[var(--room-border)] flex flex-col bg-[var(--room-bg)] p-3">
            <HostCameraLayer layout="side" visible={true} />
          </div>
        )}
      </div>

      {/* ─── Conversation Card Overlay ─── */}
      <ConversationCardOverlay
        card={activeCard}
        onRespond={handleCardRespond}
        onDismiss={handleCardDismiss}
      />

      {/* ─── Chat Panel (slide-in from right) ─── */}
      <ChatPanel
        eventId={eventId}
        isOpen={chatOpen}
        onToggle={() => setChatOpen(!chatOpen)}
      />
    </main>
  );
}

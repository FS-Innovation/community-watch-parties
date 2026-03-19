"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import ActivityFeed from "@/components/ActivityFeed";
import ThisOrThatGame from "@/components/ThisOrThatGame";
import ReactionBar from "@/components/ReactionBar";
import ChatPanel from "@/components/ChatPanel";
import { getViewerId, getViewerName } from "@/lib/viewer";
import type { ReactionEmoji, PreShowPhase } from "@/lib/types";

const DEMO_EVENT_ID = "demo-event";

type MobileTab = "feed" | "chat" | "games";

export default function MobileSecondScreen() {
  const [eventId] = useState(DEMO_EVENT_ID);
  const [eventStatus, setEventStatus] = useState("waiting");
  const [activeTab, setActiveTab] = useState<MobileTab>("feed");
  const [preshowPhase, setPreshowPhase] = useState<PreShowPhase>("arrival");
  const viewerId = typeof window !== "undefined" ? getViewerId() : "";

  // Poll sync state
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/sync?event_id=${eventId}`);
      const data = await res.json();
      if (data.event_status) setEventStatus(data.event_status);
    } catch { /* ignore */ }
  }, [eventId]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [poll]);

  const handleReaction = useCallback((emoji: ReactionEmoji) => {
    fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, viewer_id: viewerId, emoji }),
    }).catch(() => {});
  }, [eventId, viewerId]);

  const tabs: { id: MobileTab; label: string; icon: string }[] = [
    { id: "feed", label: "Feed", icon: "📡" },
    { id: "chat", label: "Chat", icon: "💬" },
    { id: "games", label: "Games", icon: "⚡" },
  ];

  return (
    <main className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--room-bg)]">
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-[var(--room-border)] flex items-center justify-between">
        <div>
          <p className="text-[9px] tracking-[0.2em] uppercase text-[var(--room-gold)] font-medium">
            Behind The Diary
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {eventStatus === "live" && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60" style={{ animation: "pulse-dot 1.5s infinite" }} />
                <span className="text-[10px] text-white/60 font-medium">LIVE</span>
              </div>
            )}
            {eventStatus === "countdown" && (
              <span className="text-[10px] text-[var(--room-text-muted)]">Pre-show</span>
            )}
            {eventStatus === "afterparty" && (
              <span className="text-[10px] text-[var(--room-gold)]">Afterparty</span>
            )}
          </div>
        </div>
        <span className="text-[8px] tracking-[0.15em] uppercase text-white/20 border border-white/10 px-2 py-0.5 rounded">
          Second Screen
        </span>
      </header>

      {/* Reactions (always visible during live) */}
      {eventStatus === "live" && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-[var(--room-border)]">
          <ReactionBar onReaction={handleReaction} />
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "feed" && (
          <ActivityFeed eventId={eventId} />
        )}

        {activeTab === "chat" && (
          <ChatPanel
            eventId={eventId}
            isOpen={true}
            onToggle={() => {}}
            inline
            roomName="The Connection Room"
            phase={preshowPhase}
          />
        )}

        {activeTab === "games" && (
          <div className="h-full overflow-y-auto p-4 space-y-6">
            <ThisOrThatGame
              eventId={eventId}
              viewerId={viewerId}
              phase={eventStatus === "afterparty" ? "afterparty" : "lobby"}
            />
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <nav className="flex-shrink-0 border-t border-[var(--room-border)] flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors"
            style={{
              color: activeTab === tab.id ? "var(--room-text)" : "var(--room-text-muted)",
              background: activeTab === tab.id ? "rgba(255,255,255,0.03)" : "transparent",
            }}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="text-[9px] tracking-wider uppercase font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

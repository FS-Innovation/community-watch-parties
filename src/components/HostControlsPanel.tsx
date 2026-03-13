"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HostLayout, PreShowPhase } from "@/lib/types";
import { PHASE_LABELS } from "@/lib/preshow";

interface Props {
  eventId: string;
  isOpen: boolean;
  onToggle: () => void;
  eventStatus: string;
  curtainsOpen: boolean;
  hostLayout: HostLayout;
  hostVisible: boolean;
  onSyncUpdate: () => void;
  preshowPhase?: PreShowPhase;
  onPhaseSkip?: (phase: PreShowPhase) => void;
}

export default function HostControlsPanel({
  eventId, isOpen, onToggle, eventStatus, curtainsOpen,
  hostLayout, hostVisible, onSyncUpdate, preshowPhase, onPhaseSkip,
}: Props) {
  const [playbackId, setPlaybackId] = useState("");
  const [seekTime, setSeekTime] = useState("0");

  const sendSync = async (body: Record<string, unknown>) => {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, ...body }),
    });
    onSyncUpdate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="z-[55] bg-[var(--room-panel)] backdrop-blur-xl border-t border-[var(--room-border)] shadow-2xl flex-shrink-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-2 border-b border-[var(--room-border)]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--room-accent)]">Host Controls</span>
              <span className="text-[9px] text-[var(--room-text-muted)] bg-[var(--room-surface)] px-1.5 py-0.5 rounded">` to toggle</span>
            </div>
            <button onClick={onToggle} className="text-[var(--room-text-muted)] hover:text-[var(--room-text)]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Controls grid */}
          <div className="px-5 py-3 flex gap-6 overflow-x-auto">
            {/* Event Status */}
            <div className="flex-shrink-0">
              <label className="text-[9px] text-[var(--room-text-muted)] uppercase tracking-wider block mb-1.5">Status</label>
              <div className="flex gap-1">
                {(["waiting", "countdown", "live", "ended"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => sendSync({ event_status: s, ...(s === "countdown" ? { countdown_duration: 300 } : {}) })}
                    className={`px-2 py-1 rounded text-[10px] capitalize transition-colors ${
                      eventStatus === s
                        ? "bg-[var(--room-accent)] text-white"
                        : "bg-[var(--room-surface)] text-[var(--room-text-muted)] hover:text-[var(--room-text)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Pre-Show Phase — click to skip */}
            {eventStatus === "countdown" && preshowPhase && (
              <div className="flex-shrink-0">
                <label className="text-[9px] text-[var(--room-text-muted)] uppercase tracking-wider block mb-1.5">Phase (click to skip)</label>
                <div className="flex gap-1">
                  {(["arrival", "warmup", "build", "silence"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => onPhaseSkip?.(p)}
                      className={`px-2 py-1 rounded text-[10px] capitalize transition-colors ${
                        preshowPhase === p
                          ? "bg-[var(--room-gold)] text-black font-medium"
                          : "bg-[var(--room-surface)] text-[var(--room-text-muted)] hover:text-[var(--room-text)] hover:bg-[var(--room-surface-hover)]"
                      }`}
                    >
                      {PHASE_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Curtains */}
            <div className="flex-shrink-0">
              <label className="text-[9px] text-[var(--room-text-muted)] uppercase tracking-wider block mb-1.5">Curtains</label>
              <div className="flex gap-1">
                <button
                  onClick={() => sendSync({ curtains_open: false })}
                  className={`px-2 py-1 rounded text-[10px] ${!curtainsOpen ? "bg-[var(--room-accent)] text-white" : "bg-[var(--room-surface)] text-[var(--room-text-muted)]"}`}
                >
                  Closed
                </button>
                <button
                  onClick={() => sendSync({ curtains_open: true })}
                  className={`px-2 py-1 rounded text-[10px] ${curtainsOpen ? "bg-[var(--room-green)] text-white" : "bg-[var(--room-surface)] text-[var(--room-text-muted)]"}`}
                >
                  Open
                </button>
              </div>
            </div>

            {/* Playback */}
            <div className="flex-shrink-0">
              <label className="text-[9px] text-[var(--room-text-muted)] uppercase tracking-wider block mb-1.5">Playback</label>
              <div className="flex gap-1 items-center">
                <button onClick={() => sendSync({ action: "play" })} className="px-2 py-1 rounded text-[10px] bg-[var(--room-accent)] text-white">
                  Play
                </button>
                <button onClick={() => sendSync({ action: "pause" })} className="px-2 py-1 rounded text-[10px] bg-[var(--room-surface)] text-[var(--room-text-muted)]">
                  Pause
                </button>
                <input
                  type="number"
                  value={seekTime}
                  onChange={(e) => setSeekTime(e.target.value)}
                  className="w-16 px-1.5 py-1 rounded text-[10px] bg-[var(--room-surface)] text-[var(--room-text)] border border-[var(--room-border)]"
                  placeholder="sec"
                />
                <button onClick={() => sendSync({ action: "seek", timestamp: parseInt(seekTime) || 0 })} className="px-2 py-1 rounded text-[10px] bg-[var(--room-surface)] text-[var(--room-text-muted)]">
                  Seek
                </button>
              </div>
            </div>

            {/* Mux Playback ID */}
            <div className="flex-shrink-0">
              <label className="text-[9px] text-[var(--room-text-muted)] uppercase tracking-wider block mb-1.5">Playback ID</label>
              <div className="flex gap-1 items-center">
                <input
                  value={playbackId}
                  onChange={(e) => setPlaybackId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && playbackId.trim()) {
                      sendSync({ playback_id: playbackId.trim() });
                    }
                  }}
                  className="w-40 px-1.5 py-1 rounded text-[10px] bg-[var(--room-surface)] text-[var(--room-text)] border border-[var(--room-border)]"
                  placeholder="Mux playback ID"
                />
                <button
                  onClick={() => playbackId.trim() && sendSync({ playback_id: playbackId.trim() })}
                  className="px-2 py-1 rounded text-[10px] bg-[var(--room-accent)] text-white"
                >
                  Set
                </button>
              </div>
            </div>

            {/* Host Camera */}
            <div className="flex-shrink-0">
              <label className="text-[9px] text-[var(--room-text-muted)] uppercase tracking-wider block mb-1.5">Host Camera</label>
              <div className="flex gap-1">
                <button
                  onClick={() => sendSync({ host_visible: !hostVisible })}
                  className={`px-2 py-1 rounded text-[10px] ${hostVisible ? "bg-[var(--room-green)] text-white" : "bg-[var(--room-surface)] text-[var(--room-text-muted)]"}`}
                >
                  {hostVisible ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => sendSync({ host_layout: hostLayout === "pip" ? "side" : "pip" })}
                  className="px-2 py-1 rounded text-[10px] bg-[var(--room-surface)] text-[var(--room-text-muted)]"
                >
                  {hostLayout === "pip" ? "PiP" : "Side"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

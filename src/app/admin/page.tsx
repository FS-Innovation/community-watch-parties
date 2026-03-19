"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { ConversationCard } from "@/lib/types";

export default function AdminDashboard() {
  const [eventId] = useState("demo-event");
  const [playbackId, setPlaybackId] = useState("");
  const [eventStatus, setEventStatus] = useState("waiting");
  const [seekTime, setSeekTime] = useState("0");
  const [hostLayout, setHostLayout] = useState("pip");
  const [hostVisible, setHostVisible] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [countdownMinutes, setCountdownMinutes] = useState("5");
  const [curtainsOpen, setCurtainsOpen] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState("");

  // Cards
  const [cards, setCards] = useState<ConversationCard[]>([]);
  const [newCardPrompt, setNewCardPrompt] = useState("");
  const [newCardTime, setNewCardTime] = useState("");
  const [newCardType, setNewCardType] = useState("card");
  const [newCardResponseType, setNewCardResponseType] = useState("text");

  // Reaction prompts
  const [newPromptTime, setNewPromptTime] = useState("");
  const [newPromptText, setNewPromptText] = useState("Did this resonate?");
  const [prompts, setPrompts] = useState<Array<{ id: string; trigger_time_seconds: number; prompt_text: string }>>([]);

  // This or That
  const [newTotA, setNewTotA] = useState("");
  const [newTotB, setNewTotB] = useState("");
  const [newTotPhase, setNewTotPhase] = useState("lobby");

  // Load data
  const loadAll = useCallback(async () => {
    try {
      const [syncRes, presenceRes] = await Promise.all([
        fetch(`/api/sync?event_id=${eventId}`),
        fetch(`/api/presence?event_id=${eventId}`),
      ]);
      const syncData = await syncRes.json();
      const presenceData = await presenceRes.json();

      if (syncData.event_status) setEventStatus(syncData.event_status);
      if (syncData.host_layout) setHostLayout(syncData.host_layout);
      if (syncData.host_visible !== undefined) setHostVisible(syncData.host_visible);
      if (syncData.curtains_open !== undefined) setCurtainsOpen(syncData.curtains_open);
      setViewerCount(presenceData.count || 0);
    } catch { /* ignore */ }
  }, [eventId]);

  const loadPrompts = useCallback(async () => {
    try {
      const res = await fetch(`/api/reaction-prompts?event_id=${eventId}&all=true`);
      const data = await res.json();
      if (data.prompts) setPrompts(data.prompts);
    } catch { /* ignore */ }
  }, [eventId]);

  useEffect(() => {
    loadAll();
    loadPrompts();
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, [loadAll, loadPrompts]);

  const sendSync = async (body: Record<string, unknown>) => {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, ...body }),
    });
    loadAll();
  };

  const addReactionPrompt = async () => {
    if (!newPromptTime) return;
    await fetch("/api/reaction-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        trigger_time_seconds: parseInt(newPromptTime),
        prompt_text: newPromptText,
      }),
    });
    setNewPromptTime("");
    loadPrompts();
  };

  const addThisOrThat = async () => {
    if (!newTotA.trim() || !newTotB.trim()) return;
    await fetch("/api/this-or-that", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        option_a: newTotA.trim(),
        option_b: newTotB.trim(),
        phase: newTotPhase,
      }),
    });
    setNewTotA("");
    setNewTotB("");
  };

  return (
    <main className="min-h-screen p-6 overflow-y-auto" style={{ background: "var(--room-bg)" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-[var(--room-text-muted)]">
              Control the screening room.
              <Link href="/" className="text-[var(--room-accent)] ml-2 hover:underline">Viewer</Link>
              {" | "}
              <Link href="/host" className="text-[var(--room-accent)] hover:underline">Host</Link>
              {" | "}
              <Link href="/mobile" className="text-[var(--room-accent)] hover:underline">Mobile</Link>
              {" | "}
              <Link href="/profile" className="text-[var(--room-accent)] hover:underline">Profile</Link>
            </p>
          </div>
          <div className="presence-badge">
            <span className="presence-dot" />
            <span>{viewerCount.toLocaleString()} watching</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Column 1: Event + Playback ─── */}
          <div className="space-y-6">
            {/* Event Control */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Event Control</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--room-text-muted)] block mb-1">Mux Playback ID</label>
                  <input value={playbackId} onChange={(e) => setPlaybackId(e.target.value)} className="admin-input" placeholder="e.g. abc123xyz" />
                </div>
                <div>
                  <label className="text-xs text-[var(--room-text-muted)] block mb-1">Spotify Playlist URL</label>
                  <div className="flex gap-2">
                    <input value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)} className="admin-input flex-1" placeholder="https://open.spotify.com/playlist/..." />
                    <button onClick={() => sendSync({ spotify_playlist_url: spotifyUrl })} className="btn-ghost text-xs">Set</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[var(--room-text-muted)] block mb-1">Event Status</label>
                  <div className="flex gap-2 flex-wrap">
                    {(["waiting", "countdown", "live", "afterparty", "ended"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => sendSync({
                          event_status: s,
                          ...(s === "countdown" ? { countdown_duration: (parseInt(countdownMinutes) || 5) * 60 } : {}),
                        })}
                        className={`btn-ghost text-xs capitalize ${eventStatus === s ? "border-[var(--room-accent)] text-[var(--room-accent)]" : ""}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {eventStatus === "waiting" && (
                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-[10px] text-[var(--room-text-muted)]">Countdown:</label>
                      <input type="number" value={countdownMinutes} onChange={(e) => setCountdownMinutes(e.target.value)} className="admin-input w-16 text-xs" min="1" max="30" />
                      <span className="text-[10px] text-[var(--room-text-muted)]">min</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-[var(--room-text-muted)] block mb-1">Curtains</label>
                  <div className="flex gap-2">
                    <button onClick={() => sendSync({ curtains_open: false })} className={`btn-ghost text-xs ${!curtainsOpen ? "border-[var(--room-accent)] text-[var(--room-accent)]" : ""}`}>Closed</button>
                    <button onClick={() => sendSync({ curtains_open: true })} className={`btn-ghost text-xs ${curtainsOpen ? "border-[var(--room-green)] text-[var(--room-green)]" : ""}`}>Open</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Playback */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Playback</h2>
              <div className="flex gap-2 mb-3">
                <button onClick={() => sendSync({ action: "play" })} className="btn-accent text-xs flex-1">Play</button>
                <button onClick={() => sendSync({ action: "pause" })} className="btn-ghost text-xs flex-1">Pause</button>
              </div>
              <div className="flex gap-2">
                <input type="number" value={seekTime} onChange={(e) => setSeekTime(e.target.value)} className="admin-input flex-1" placeholder="Seconds" />
                <button onClick={() => sendSync({ action: "seek", timestamp: parseInt(seekTime) || 0 })} className="btn-ghost text-xs">Seek</button>
              </div>
            </div>

            {/* Host Camera */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-3 text-[var(--room-accent)]">Host Camera</h2>
              <div className="space-y-2">
                <button onClick={() => sendSync({ host_visible: !hostVisible })} className={`btn-ghost text-xs ${hostVisible ? "border-[var(--room-green)] text-[var(--room-green)]" : ""}`}>
                  {hostVisible ? "Cameras ON" : "Cameras OFF"}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => sendSync({ host_layout: "pip" })} className={`btn-ghost text-xs ${hostLayout === "pip" ? "border-[var(--room-accent)] text-[var(--room-accent)]" : ""}`}>PiP</button>
                  <button onClick={() => sendSync({ host_layout: "side" })} className={`btn-ghost text-xs ${hostLayout === "side" ? "border-[var(--room-accent)] text-[var(--room-accent)]" : ""}`}>Side</button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Column 2: Cards + Reaction Prompts ─── */}
          <div className="space-y-6">
            {/* Conversation Cards */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Conversation Cards</h2>
              <div className="space-y-2 mb-4 p-3 rounded-lg bg-[var(--room-bg)] border border-[var(--room-border)]">
                <div className="flex gap-2">
                  <select value={newCardType} onChange={(e) => setNewCardType(e.target.value)} className="admin-input flex-1">
                    <option value="card">Card</option>
                    <option value="quiz">Quiz</option>
                    <option value="poll">Poll</option>
                    <option value="replay">Replay</option>
                    <option value="teaser">Teaser</option>
                  </select>
                  <select value={newCardResponseType} onChange={(e) => setNewCardResponseType(e.target.value)} className="admin-input flex-1">
                    <option value="text">Text</option>
                    <option value="emoji_choice">Emoji</option>
                    <option value="multiple_choice">Multiple Choice</option>
                  </select>
                </div>
                <input value={newCardPrompt} onChange={(e) => setNewCardPrompt(e.target.value)} className="admin-input" placeholder="Prompt" />
                <div className="flex gap-2">
                  <input value={newCardTime} onChange={(e) => setNewCardTime(e.target.value)} className="admin-input flex-1" placeholder="Trigger (seconds)" type="number" />
                  <button
                    onClick={() => {
                      if (!newCardPrompt.trim() || !newCardTime) return;
                      const card: ConversationCard = {
                        id: `card-${Date.now()}`, event_id: eventId,
                        type: newCardType as ConversationCard["type"],
                        trigger_time_seconds: parseInt(newCardTime),
                        prompt_text: newCardPrompt, options: null,
                        response_type: newCardResponseType as ConversationCard["response_type"],
                        auto_dismiss_seconds: 30, show_results: false, is_active: true, sort_order: cards.length,
                      };
                      setCards(prev => [...prev, card]);
                      setNewCardPrompt(""); setNewCardTime("");
                    }}
                    className="btn-accent text-xs"
                  >Add</button>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cards.length === 0 && <p className="text-xs text-[var(--room-text-muted)]">No cards.</p>}
                {cards.sort((a, b) => a.trigger_time_seconds - b.trigger_time_seconds).map((card) => (
                  <div key={card.id} className="flex items-center gap-3 p-2 rounded bg-[var(--room-bg)] text-xs">
                    <span className="text-[var(--room-accent)] font-mono w-12">{card.trigger_time_seconds}s</span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--room-surface-hover)] text-[10px] uppercase">{card.type}</span>
                    <span className="flex-1 truncate text-[var(--room-text-secondary)]">{card.prompt_text}</span>
                    <button onClick={() => setCards(prev => prev.filter(c => c.id !== card.id))} className="text-[var(--room-text-muted)] hover:text-[var(--room-red)]">x</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Reaction Prompts */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Reaction Prompts</h2>
              <p className="text-[10px] text-[var(--room-text-muted)] mb-3">
                Pre-marked moments — &ldquo;Did this resonate?&rdquo; overlays at specific timestamps.
              </p>
              <div className="space-y-2 mb-3 p-3 rounded-lg bg-[var(--room-bg)] border border-[var(--room-border)]">
                <input value={newPromptText} onChange={(e) => setNewPromptText(e.target.value)} className="admin-input" placeholder="Prompt text" />
                <div className="flex gap-2">
                  <input value={newPromptTime} onChange={(e) => setNewPromptTime(e.target.value)} className="admin-input flex-1" placeholder="Trigger (seconds)" type="number" />
                  <button onClick={addReactionPrompt} className="btn-accent text-xs">Add</button>
                </div>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {prompts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded bg-[var(--room-bg)] text-xs">
                    <span className="text-[var(--room-accent)] font-mono w-12">{p.trigger_time_seconds}s</span>
                    <span className="flex-1 truncate text-[var(--room-text-secondary)]">{p.prompt_text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Column 3: This or That + Engagement ─── */}
          <div className="space-y-6">
            {/* This or That */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">This or That Games</h2>
              <div className="space-y-2 mb-3 p-3 rounded-lg bg-[var(--room-bg)] border border-[var(--room-border)]">
                <input value={newTotA} onChange={(e) => setNewTotA(e.target.value)} className="admin-input" placeholder="Option A" />
                <input value={newTotB} onChange={(e) => setNewTotB(e.target.value)} className="admin-input" placeholder="Option B" />
                <div className="flex gap-2">
                  <select value={newTotPhase} onChange={(e) => setNewTotPhase(e.target.value)} className="admin-input flex-1">
                    <option value="lobby">Lobby</option>
                    <option value="afterparty">Afterparty</option>
                  </select>
                  <button onClick={addThisOrThat} className="btn-accent text-xs">Add</button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Quick Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    fetch("/api/activity", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        event_id: eventId, type: "milestone",
                        content: "1,000 viewers watching!",
                      }),
                    });
                  }}
                  className="btn-ghost text-xs w-full"
                >Post milestone to feed</button>

                <button
                  onClick={() => {
                    fetch("/api/activity", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        event_id: eventId, type: "system",
                        content: "The afterparty is starting...",
                      }),
                    });
                  }}
                  className="btn-ghost text-xs w-full"
                >Post system message</button>

                <button
                  onClick={() => sendSync({ event_status: "afterparty" })}
                  className="btn-ghost text-xs w-full"
                  style={eventStatus === "live" ? { borderColor: "rgba(124,92,252,0.4)", color: "rgba(124,92,252,0.8)" } : {}}
                >Start Afterparty</button>
              </div>
            </div>

            {/* Engagement Stats */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-3 text-[var(--room-accent)]">Live Stats</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-[var(--room-bg)]">
                  <p className="text-lg font-bold font-mono">{viewerCount}</p>
                  <p className="text-[9px] text-[var(--room-text-muted)] uppercase tracking-wider">Viewers</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-[var(--room-bg)]">
                  <p className="text-lg font-bold font-mono">{eventStatus}</p>
                  <p className="text-[9px] text-[var(--room-text-muted)] uppercase tracking-wider">Status</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

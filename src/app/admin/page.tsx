"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { ConversationCard, QAQuestion } from "@/lib/types";

export default function AdminDashboard() {
  const [eventId] = useState("demo-event");
  const [playbackId, setPlaybackId] = useState("");
  const [eventStatus, setEventStatus] = useState("waiting");
  const [seekTime, setSeekTime] = useState("0");
  const [hostLayout, setHostLayout] = useState("pip");
  const [hostVisible, setHostVisible] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);

  // Cards
  const [cards, setCards] = useState<ConversationCard[]>([]);
  const [newCardPrompt, setNewCardPrompt] = useState("");
  const [newCardTime, setNewCardTime] = useState("");
  const [newCardType, setNewCardType] = useState("card");
  const [newCardResponseType, setNewCardResponseType] = useState("text");

  // Q&A
  const [questions, setQuestions] = useState<QAQuestion[]>([]);

  // Load data
  const loadAll = useCallback(async () => {
    try {
      const [syncRes, presenceRes, qaRes] = await Promise.all([
        fetch(`/api/sync?event_id=${eventId}`),
        fetch(`/api/presence?event_id=${eventId}`),
        fetch(`/api/qa?event_id=${eventId}`),
      ]);
      const syncData = await syncRes.json();
      const presenceData = await presenceRes.json();
      const qaData = await qaRes.json();

      if (syncData.event_status) setEventStatus(syncData.event_status);
      if (syncData.host_layout) setHostLayout(syncData.host_layout);
      if (syncData.host_visible !== undefined) setHostVisible(syncData.host_visible);
      setViewerCount(presenceData.count || 0);
      setQuestions(qaData.questions || []);
    } catch { /* ignore */ }
  }, [eventId]);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, [loadAll]);

  // ─── Sync Controls ───
  const sendSync = async (body: Record<string, unknown>) => {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, ...body }),
    });
    loadAll();
  };

  // ─── Q&A Moderation ───
  const setQuestionStatus = async (questionId: string, status: string) => {
    // In production: POST to API to update status
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, status: status as QAQuestion["status"] } : q))
    );
  };

  return (
    <main className="min-h-screen p-6 overflow-y-auto" style={{ background: "var(--room-bg)" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-[var(--room-text-muted)]">
              Control the screening room.
              <Link href="/" className="text-[var(--room-accent)] ml-2 hover:underline">Open viewer</Link>
              {" | "}
              <Link href="/host" className="text-[var(--room-accent)] hover:underline">Open host page</Link>
            </p>
          </div>
          <div className="presence-badge">
            <span className="presence-dot" />
            <span>{viewerCount.toLocaleString()} watching</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Event Control ─── */}
          <div className="admin-card">
            <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Event Control</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--room-text-muted)] block mb-1">Mux Playback ID</label>
                <input
                  value={playbackId}
                  onChange={(e) => setPlaybackId(e.target.value)}
                  className="admin-input"
                  placeholder="e.g. abc123xyz"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--room-text-muted)] block mb-1">Event Status</label>
                <div className="flex gap-2">
                  {(["waiting", "live", "ended"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => sendSync({ event_status: s })}
                      className={`btn-ghost text-xs capitalize ${eventStatus === s ? "border-[var(--room-accent)] text-[var(--room-accent)]" : ""}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Playback Control ─── */}
          <div className="admin-card">
            <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Playback Control</h2>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => sendSync({ action: "play" })}
                className="btn-accent text-xs flex items-center gap-1"
              >
                ▶ Play
              </button>
              <button
                onClick={() => sendSync({ action: "pause" })}
                className="btn-ghost text-xs flex items-center gap-1"
              >
                ⏸ Pause
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                value={seekTime}
                onChange={(e) => setSeekTime(e.target.value)}
                className="admin-input flex-1"
                placeholder="Seek to (seconds)"
              />
              <button
                onClick={() => sendSync({ action: "seek", timestamp: parseInt(seekTime) || 0 })}
                className="btn-ghost text-xs"
              >
                Seek
              </button>
            </div>

            <p className="text-[11px] text-[var(--room-text-muted)] mt-2">
              Play/pause commands broadcast instantly to all viewers.
            </p>
          </div>

          {/* ─── Host Management ─── */}
          <div className="admin-card">
            <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Host Camera</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--room-text-muted)] block mb-1">Camera Visibility</label>
                <button
                  onClick={() => sendSync({ host_visible: !hostVisible })}
                  className={`btn-ghost text-xs ${hostVisible ? "border-[var(--room-green)] text-[var(--room-green)]" : ""}`}
                >
                  {hostVisible ? "Cameras ON" : "Cameras OFF"}
                </button>
              </div>
              <div>
                <label className="text-xs text-[var(--room-text-muted)] block mb-1">Layout</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => sendSync({ host_layout: "pip" })}
                    className={`btn-ghost text-xs ${hostLayout === "pip" ? "border-[var(--room-accent)] text-[var(--room-accent)]" : ""}`}
                  >
                    PiP Overlay
                  </button>
                  <button
                    onClick={() => sendSync({ host_layout: "side" })}
                    className={`btn-ghost text-xs ${hostLayout === "side" ? "border-[var(--room-accent)] text-[var(--room-accent)]" : ""}`}
                  >
                    Side Panel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Conversation Cards Timeline ─── */}
          <div className="admin-card">
            <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Cards &amp; Interactive Moments</h2>

            {/* Add new card */}
            <div className="space-y-2 mb-4 p-3 rounded-lg bg-[var(--room-bg)] border border-[var(--room-border)]">
              <div className="flex gap-2">
                <select value={newCardType} onChange={(e) => setNewCardType(e.target.value)} className="admin-input flex-1">
                  <option value="card">Conversation Card</option>
                  <option value="quiz">Quiz</option>
                  <option value="poll">Poll</option>
                  <option value="replay">Replay</option>
                  <option value="teaser">Teaser</option>
                </select>
                <select value={newCardResponseType} onChange={(e) => setNewCardResponseType(e.target.value)} className="admin-input flex-1">
                  <option value="text">Text Response</option>
                  <option value="emoji_choice">Emoji Choice</option>
                  <option value="multiple_choice">Multiple Choice</option>
                </select>
              </div>
              <input value={newCardPrompt} onChange={(e) => setNewCardPrompt(e.target.value)} className="admin-input" placeholder="Prompt text" />
              <div className="flex gap-2">
                <input value={newCardTime} onChange={(e) => setNewCardTime(e.target.value)} className="admin-input flex-1" placeholder="Trigger time (seconds)" type="number" />
                <button
                  onClick={() => {
                    if (!newCardPrompt.trim() || !newCardTime) return;
                    const card: ConversationCard = {
                      id: `card-${Date.now()}`,
                      event_id: eventId,
                      type: newCardType as ConversationCard["type"],
                      trigger_time_seconds: parseInt(newCardTime),
                      prompt_text: newCardPrompt,
                      options: null,
                      response_type: newCardResponseType as ConversationCard["response_type"],
                      auto_dismiss_seconds: 30,
                      show_results: false,
                      is_active: true,
                      sort_order: cards.length,
                    };
                    setCards((prev) => [...prev, card]);
                    setNewCardPrompt("");
                    setNewCardTime("");
                  }}
                  className="btn-accent text-xs"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Card list */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cards.length === 0 && (
                <p className="text-xs text-[var(--room-text-muted)]">No cards configured. Add one above.</p>
              )}
              {cards.sort((a, b) => a.trigger_time_seconds - b.trigger_time_seconds).map((card) => (
                <div key={card.id} className="flex items-center gap-3 p-2 rounded bg-[var(--room-bg)] text-xs">
                  <span className="text-[var(--room-accent)] font-mono w-12">{card.trigger_time_seconds}s</span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--room-surface-hover)] text-[10px] uppercase">{card.type}</span>
                  <span className="flex-1 truncate text-[var(--room-text-secondary)]">{card.prompt_text}</span>
                  <button
                    onClick={() => setCards((prev) => prev.filter((c) => c.id !== card.id))}
                    className="text-[var(--room-text-muted)] hover:text-[var(--room-red)]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Q&A Moderation (full width) ─── */}
        <div className="admin-card mt-6">
          <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Q&amp;A Moderation</h2>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {questions.length === 0 && (
              <p className="text-xs text-[var(--room-text-muted)]">No questions submitted yet.</p>
            )}
            {questions
              .sort((a, b) => b.upvote_count - a.upvote_count)
              .map((q) => (
                <div
                  key={q.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                    q.status === "selected"
                      ? "border-[var(--room-accent)] bg-[rgba(232,115,74,0.04)]"
                      : q.status === "hidden"
                      ? "border-[var(--room-border)] opacity-40"
                      : "border-[var(--room-border)]"
                  }`}
                >
                  <span className="text-[var(--room-accent)] font-bold min-w-[30px] text-right">
                    {q.upvote_count}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p>{q.question_text}</p>
                    <p className="text-xs text-[var(--room-text-muted)] mt-1">— {q.display_name}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {q.status !== "selected" && (
                      <button
                        onClick={() => setQuestionStatus(q.id, "selected")}
                        className="btn-ghost text-[10px] px-2 py-1"
                        title="Select to answer live"
                      >
                        Select
                      </button>
                    )}
                    {q.status === "selected" && (
                      <button
                        onClick={() => setQuestionStatus(q.id, "answered")}
                        className="btn-accent text-[10px] px-2 py-1"
                      >
                        Mark Answered
                      </button>
                    )}
                    {q.status !== "hidden" ? (
                      <button
                        onClick={() => setQuestionStatus(q.id, "hidden")}
                        className="btn-ghost text-[10px] px-2 py-1 hover:text-[var(--room-red)]"
                      >
                        Hide
                      </button>
                    ) : (
                      <button
                        onClick={() => setQuestionStatus(q.id, "visible")}
                        className="btn-ghost text-[10px] px-2 py-1"
                      >
                        Show
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}

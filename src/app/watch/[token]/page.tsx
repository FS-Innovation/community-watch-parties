"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { REACTIONS, type ReactionType, type ConversationCard, type Question } from "@/lib/types";

interface UserData {
  id: string;
  first_name: string;
  email: string;
  seat_code: string;
  ticket_number: number;
  role: string;
  event_id: string;
}

interface FloatingReaction {
  id: number;
  emoji: string;
  x: number;
}

export default function WatchRoom() {
  const params = useParams();
  const token = params.token as string;

  const [user, setUser] = useState<UserData | null>(null);
  const [status, setStatus] = useState<"loading" | "authorized" | "denied">("loading");
  const [viewerCount, setViewerCount] = useState(0);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [activeCard, setActiveCard] = useState<ConversationCard | null>(null);
  const [cardResponse, setCardResponse] = useState("");
  const [showQA, setShowQA] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Array<{ first_name: string; score: number }>>([]);
  const [lastReactionTime, setLastReactionTime] = useState(0);
  const reactionIdRef = useRef(0);

  // Verify token
  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch("/api/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) { setStatus("denied"); return; }
        const data = await res.json();
        setUser(data.user);
        setStatus("authorized");
      } catch { setStatus("denied"); }
    }
    verify();
  }, [token]);

  // Poll presence count
  useEffect(() => {
    if (status !== "authorized" || !user?.event_id) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/screening/presence?event_id=${user.event_id}`);
        const data = await res.json();
        setViewerCount(data.count || 0);
      } catch { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [status, user?.event_id]);

  // Poll conversation cards
  useEffect(() => {
    if (status !== "authorized" || !user?.event_id) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/screening/cards?event_id=${user.event_id}`);
        const data = await res.json();
        if (data.card) setActiveCard(data.card);
      } catch { /* ignore */ }
    };
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [status, user?.event_id]);

  // Load questions
  const loadQuestions = useCallback(async () => {
    if (!user?.event_id) return;
    try {
      const res = await fetch(`/api/screening/questions?event_id=${user.event_id}`);
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch { /* ignore */ }
  }, [user?.event_id]);

  // Load leaderboard
  const loadLeaderboard = useCallback(async () => {
    if (!user?.event_id) return;
    try {
      const res = await fetch(`/api/screening/leaderboard?event_id=${user.event_id}`);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch { /* ignore */ }
  }, [user?.event_id]);

  const sendReaction = useCallback((emoji: ReactionType) => {
    const now = Date.now();
    if (now - lastReactionTime < 3000) return; // Rate limit: 1 per 3s
    setLastReactionTime(now);

    const id = reactionIdRef.current++;
    const x = 20 + Math.random() * 60; // random horizontal position
    setReactions((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);

    // Fire to server
    fetch("/api/screening/reaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, emoji }),
    }).catch(() => {});
  }, [lastReactionTime, token]);

  const submitCardResponse = async () => {
    if (!activeCard || !cardResponse.trim()) return;
    await fetch("/api/screening/card-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, card_id: activeCard.id, response: cardResponse }),
    }).catch(() => {});
    setCardResponse("");
    setActiveCard(null);
  };

  const submitQuestion = async () => {
    if (!newQuestion.trim()) return;
    await fetch("/api/screening/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, question: newQuestion }),
    }).catch(() => {});
    setNewQuestion("");
    loadQuestions();
  };

  const upvoteQuestion = async (questionId: string) => {
    await fetch("/api/screening/questions/upvote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, question_id: questionId }),
    }).catch(() => {});
    loadQuestions();
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--cwp-gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--cwp-text-muted)]">Entering the screening room...</p>
        </div>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
          <p className="text-[var(--cwp-text-muted)] mb-6">This ticket link is invalid or has expired.</p>
          <Link href="/" className="btn-primary inline-block">Register for a Watch Party</Link>
        </div>
      </main>
    );
  }

  const isHost = user?.role === "host";

  return (
    <main className="min-h-screen relative">
      {/* ─── Top Bar ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-gradient-to-b from-[var(--cwp-darker)] via-[var(--cwp-darker)]/90 to-transparent">
        <div className="flex items-center gap-4">
          <span className="text-xs tracking-[0.2em] uppercase text-[var(--cwp-gold)] font-semibold">
            BTD Screening
          </span>
          {isHost && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--cwp-gold)]/15 text-[10px] text-[var(--cwp-gold)] font-semibold uppercase">
              Host
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="presence-badge">
            <span className="presence-dot" />
            <span>{viewerCount.toLocaleString()} watching</span>
          </div>
          <span className="text-xs text-[var(--cwp-text-muted)]">
            {user?.first_name} &middot; {user?.seat_code}
          </span>
        </div>
      </header>

      {/* ─── Video Player Area ─── */}
      <div className="pt-14 pb-24 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Mux Player Placeholder */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[var(--cwp-surface)] border border-[var(--cwp-border-subtle)]">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-lg text-[var(--cwp-gold)] font-medium mb-2">
                Screening Room
              </p>
              <p className="text-sm text-[var(--cwp-text-muted)] mb-4">
                Mux HLS player renders here — synced via Supabase Realtime
              </p>
              <p className="text-xs text-[var(--cwp-text-muted)]">
                Server-controlled playback with 2-3s sync tolerance
              </p>
            </div>

            {/* Host camera PiP placeholder */}
            <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg bg-[var(--cwp-dark)] border border-[var(--cwp-border-subtle)] flex items-center justify-center">
              <p className="text-xs text-[var(--cwp-text-muted)]">Host camera (LiveKit)</p>
            </div>

            {/* Floating Reactions */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {reactions.map((r) => (
                <span
                  key={r.id}
                  className="floating-reaction"
                  style={{ left: `${r.x}%`, bottom: "10%" }}
                >
                  {r.emoji}
                </span>
              ))}
            </div>
          </div>

          {/* ─── Reaction Bar ─── */}
          <div className="flex items-center justify-center gap-3 mt-4">
            {REACTIONS.map((r) => (
              <button
                key={r.emoji}
                onClick={() => sendReaction(r.emoji as ReactionType)}
                className="reaction-btn"
                title={r.label}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Conversation Card Overlay ─── */}
      <AnimatePresence>
        {activeCard && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4"
          >
            <div className="glass-panel p-6">
              <p className="text-xs tracking-[0.2em] uppercase text-[var(--cwp-gold)] font-medium mb-2">
                Conversation Card
              </p>
              <p className="text-lg font-medium mb-4">{activeCard.prompt_text}</p>
              {activeCard.response_type === "text" && (
                <div className="flex gap-2">
                  <input
                    value={cardResponse}
                    onChange={(e) => setCardResponse(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Your response..."
                  />
                  <button onClick={submitCardResponse} className="btn-primary">
                    Send
                  </button>
                </div>
              )}
              {activeCard.response_type === "emoji" && (
                <div className="flex gap-2 justify-center">
                  {REACTIONS.map((r) => (
                    <button
                      key={r.emoji}
                      onClick={() => {
                        setCardResponse(r.emoji);
                        submitCardResponse();
                      }}
                      className="reaction-btn"
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setActiveCard(null)}
                className="text-xs text-[var(--cwp-text-muted)] mt-3 hover:text-[var(--cwp-text)] transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom Panel: Q&A / Leaderboard toggles ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[var(--cwp-darker)] via-[var(--cwp-darker)]/90 to-transparent pt-8 pb-4 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => { setShowQA(!showQA); setShowLeaderboard(false); if (!showQA) loadQuestions(); }}
              className={`btn-secondary text-sm ${showQA ? "border-[var(--cwp-gold)] text-[var(--cwp-gold)]" : ""}`}
            >
              Q&amp;A
            </button>
            <button
              onClick={() => { setShowLeaderboard(!showLeaderboard); setShowQA(false); if (!showLeaderboard) loadLeaderboard(); }}
              className={`btn-secondary text-sm ${showLeaderboard ? "border-[var(--cwp-gold)] text-[var(--cwp-gold)]" : ""}`}
            >
              Leaderboard
            </button>
          </div>
          {isHost && (
            <Link href={`/post-watch/${token}`} className="btn-secondary text-sm">
              End &amp; Go to Post-Watch
            </Link>
          )}
        </div>
      </div>

      {/* ─── Q&A Panel ─── */}
      <AnimatePresence>
        {showQA && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-4 z-40 w-96 max-h-[50vh] glass-panel overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-[var(--cwp-border-subtle)]">
              <h3 className="font-semibold text-sm">Live Q&amp;A</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {questions.length === 0 && (
                <p className="text-sm text-[var(--cwp-text-muted)]">No questions yet. Be the first!</p>
              )}
              {questions.map((q) => (
                <div key={q.id} className="glass-panel-light p-3">
                  <p className="text-sm mb-2">{q.question}</p>
                  <button
                    onClick={() => upvoteQuestion(q.id)}
                    className="text-xs text-[var(--cwp-text-muted)] hover:text-[var(--cwp-gold)] transition-colors"
                  >
                    ▲ {q.upvotes}
                  </button>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-[var(--cwp-border-subtle)] flex gap-2">
              <input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="input-field flex-1 text-sm"
                placeholder="Ask a question..."
              />
              <button onClick={submitQuestion} className="btn-primary text-sm px-4">
                Ask
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Leaderboard Panel ─── */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-4 z-40 w-80 glass-panel overflow-hidden"
          >
            <div className="p-4 border-b border-[var(--cwp-border-subtle)]">
              <h3 className="font-semibold text-sm">Engagement Leaderboard</h3>
              <p className="text-xs text-[var(--cwp-text-muted)]">Top 5 get to meet Steven</p>
            </div>
            <div className="p-4 space-y-2">
              {leaderboard.length === 0 && (
                <p className="text-sm text-[var(--cwp-text-muted)]">Engage to climb the board!</p>
              )}
              {leaderboard.map((entry, i) => (
                <div key={i} className="leaderboard-row">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: i < 3 ? "var(--cwp-gold)" : "var(--cwp-surface)",
                      color: i < 3 ? "var(--cwp-dark)" : "var(--cwp-text)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">{entry.first_name}</span>
                  <span className="text-sm text-[var(--cwp-gold)] font-medium">{entry.score}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

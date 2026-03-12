"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConversationCard } from "@/lib/types";
import { REACTIONS } from "@/lib/types";

interface Props {
  card: ConversationCard | null;
  onRespond: (cardId: string, value: string) => void;
  onDismiss: () => void;
  resultSummary?: Record<string, number> | null;
}

export default function ConversationCardOverlay({ card, onRespond, onDismiss, resultSummary }: Props) {
  const [response, setResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Auto-dismiss countdown — no setState calls to parent during render
  useEffect(() => {
    if (!card) {
      setSubmitted(false);
      setResponse("");
      return;
    }

    const duration = card.auto_dismiss_seconds;
    setTimeLeft(duration);
    setSubmitted(false);
    setResponse("");

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Defer the parent state update to avoid setState-during-render
          setTimeout(() => dismissRef.current(), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [card]);

  const handleSubmit = () => {
    if (!card || !response.trim()) return;
    onRespond(card.id, response);
    setSubmitted(true);
  };

  const handleChoiceSelect = (choice: string) => {
    if (!card) return;
    onRespond(card.id, choice);
    setSubmitted(true);
  };

  const isFullScreen = card?.type !== "card";

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          initial={{ opacity: 0, y: isFullScreen ? 0 : 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: isFullScreen ? 0 : 40 }}
          className={`fixed z-40 ${
            isFullScreen
              ? "inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              : "bottom-24 left-1/2 -translate-x-1/2 w-full max-w-lg px-4"
          }`}
        >
          <div className={`card-overlay p-6 ${isFullScreen ? "w-full max-w-xl mx-4" : "w-full"}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--room-accent)] font-medium">
                {card.type === "card" ? "Conversation Card" : card.type === "quiz" ? "Quiz" : card.type === "poll" ? "Poll" : card.type}
              </span>
              <span className="text-xs text-[var(--room-text-muted)]">{timeLeft}s</span>
            </div>

            <p className="text-lg font-medium mb-4 leading-snug">{card.prompt_text}</p>

            {!submitted ? (
              <>
                {card.response_type === "text" && (
                  <div className="flex gap-2">
                    <input
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      className="room-input flex-1"
                      placeholder="Type your response..."
                      autoFocus
                    />
                    <button onClick={handleSubmit} className="btn-accent" disabled={!response.trim()}>
                      Send
                    </button>
                  </div>
                )}

                {card.response_type === "emoji_choice" && (
                  <div className="flex gap-3 justify-center">
                    {REACTIONS.map((r) => (
                      <button
                        key={r.emoji}
                        onClick={() => handleChoiceSelect(r.emoji)}
                        className="reaction-btn text-2xl w-14 h-14"
                      >
                        {r.emoji}
                      </button>
                    ))}
                  </div>
                )}

                {card.response_type === "multiple_choice" && card.options && (
                  <div className="space-y-2">
                    {card.options.map((option, i) => (
                      <button
                        key={i}
                        onClick={() => handleChoiceSelect(option)}
                        className="w-full text-left p-3 rounded-lg bg-[var(--room-surface)] border border-[var(--room-border)] hover:border-[var(--room-accent)] transition-colors text-sm"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-[var(--room-green)]">Response submitted</p>
                {card.show_results && resultSummary && (
                  <div className="mt-3 space-y-1">
                    {Object.entries(resultSummary).map(([val, count]) => (
                      <div key={val} className="flex items-center gap-2 text-xs">
                        <span className="text-[var(--room-text-secondary)]">{val}</span>
                        <div className="flex-1 h-1 bg-[var(--room-surface)] rounded overflow-hidden">
                          <div className="h-full bg-[var(--room-accent)] rounded" style={{ width: `${Math.min(100, count)}%` }} />
                        </div>
                        <span className="text-[var(--room-text-muted)]">{count}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onDismiss}
              className="text-xs text-[var(--room-text-muted)] hover:text-[var(--room-text)] transition-colors mt-3 block mx-auto"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

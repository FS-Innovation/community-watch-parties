"use client";

import { useState, useEffect, useCallback } from "react";
import type { QAQuestion } from "@/lib/types";
import { getViewerId, getViewerName, setViewerName } from "@/lib/viewer";

interface Props {
  eventId: string;
}

export default function QAPanel({ eventId }: Props) {
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitAt, setLastSubmitAt] = useState(0);
  const [nameSet, setNameSet] = useState(false);

  const viewerId = typeof window !== "undefined" ? getViewerId() : "";

  // Load name from localStorage
  useEffect(() => {
    const saved = getViewerName();
    if (saved) {
      setDisplayName(saved);
      setNameSet(true);
    }
  }, []);

  // Load questions
  const loadQuestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/qa?event_id=${eventId}`);
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch { /* ignore */ }
  }, [eventId]);

  useEffect(() => {
    loadQuestions();
    const interval = setInterval(loadQuestions, 5000);
    return () => clearInterval(interval);
  }, [loadQuestions]);

  const submitQuestion = async () => {
    if (!newQuestion.trim() || !displayName.trim()) return;
    const now = Date.now();
    if (now - lastSubmitAt < 60000) return; // 1 question per 60s

    setSubmitting(true);
    setViewerName(displayName);
    setNameSet(true);

    await fetch("/api/qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        viewer_id: viewerId,
        display_name: displayName,
        question_text: newQuestion,
      }),
    }).catch(() => {});

    setNewQuestion("");
    setLastSubmitAt(now);
    setSubmitting(false);
    loadQuestions();
  };

  const upvote = async (questionId: string) => {
    if (votedIds.has(questionId)) return;
    setVotedIds((prev) => new Set(prev).add(questionId));

    await fetch("/api/qa/upvote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId, viewer_id: viewerId }),
    }).catch(() => {});

    // Optimistic update
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, upvote_count: q.upvote_count + 1 } : q
      )
    );
  };

  const selectedQuestion = questions.find((q) => q.status === "selected");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--room-border)] flex-shrink-0">
        <h3 className="font-semibold text-sm">Live Q&amp;A</h3>
        <p className="text-[11px] text-[var(--room-text-muted)] mt-0.5">
          {questions.filter((q) => q.status !== "hidden").length} questions
        </p>
      </div>

      {/* Now answering banner */}
      {selectedQuestion && (
        <div className="now-answering mx-3 mt-3 flex-shrink-0">
          <p className="text-[10px] tracking-[0.15em] uppercase text-[var(--room-accent)] font-medium mb-1">
            Now Answering
          </p>
          <p className="text-sm font-medium">{selectedQuestion.question_text}</p>
          <p className="text-xs text-[var(--room-text-muted)] mt-1">
            — {selectedQuestion.display_name}
          </p>
        </div>
      )}

      {/* Questions list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {questions
          .filter((q) => q.status !== "hidden")
          .sort((a, b) => b.upvote_count - a.upvote_count)
          .map((q) => (
            <div
              key={q.id}
              className={`qa-question flex gap-3 ${q.status === "selected" ? "selected" : ""}`}
            >
              <button
                onClick={() => upvote(q.id)}
                className={`upvote-btn flex-shrink-0 ${votedIds.has(q.id) ? "voted" : ""}`}
                disabled={votedIds.has(q.id)}
              >
                <span>▲</span>
                <span>{q.upvote_count}</span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">{q.question_text}</p>
                <p className="text-[11px] text-[var(--room-text-muted)] mt-1">{q.display_name}</p>
              </div>
              {q.status === "answered" && (
                <span className="text-[10px] text-[var(--room-green)] flex-shrink-0 self-start mt-1">Answered</span>
              )}
            </div>
          ))}
        {questions.length === 0 && (
          <p className="text-sm text-[var(--room-text-muted)] text-center py-8">
            No questions yet. Be the first to ask!
          </p>
        )}
      </div>

      {/* Submit form */}
      <div className="p-3 border-t border-[var(--room-border)] flex-shrink-0 space-y-2">
        {!nameSet && (
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="room-input text-xs"
            placeholder="Your display name"
          />
        )}
        <div className="flex gap-2">
          <input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitQuestion()}
            className="room-input flex-1 text-xs"
            placeholder="Ask a question..."
          />
          <button
            onClick={submitQuestion}
            disabled={submitting || !newQuestion.trim() || !displayName.trim()}
            className="btn-accent text-xs px-3"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}

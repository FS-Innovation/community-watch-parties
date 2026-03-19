"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  eventId: string;
  viewerId: string;
  displayName: string;
  isVisible: boolean;
}

export default function QuestionSubmit({ eventId, viewerId, displayName, isVisible }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = useCallback(async () => {
    if (!question.trim()) return;
    setSubmitted(true);

    try {
      await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          viewer_id: viewerId,
          display_name: displayName || "Anonymous",
          question_text: question.trim(),
          source: "live",
        }),
      });

      // Track engagement
      await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          viewer_id: viewerId,
          metric_type: "question_submit",
        }),
      });
    } catch { /* ignore */ }

    setTimeout(() => {
      setIsOpen(false);
      setQuestion("");
      setSubmitted(false);
    }, 3000);
  }, [question, eventId, viewerId, displayName]);

  if (!isVisible) return null;

  return (
    <>
      {/* Floating question button */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2, type: "spring" }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 z-[45] w-12 h-12 rounded-full flex items-center justify-center shadow-xl"
          style={{
            background: "rgba(124,92,252,0.3)",
            border: "1px solid rgba(124,92,252,0.4)",
            backdropFilter: "blur(10px)",
          }}
          title="Ask a question"
        >
          <span className="text-lg">❓</span>
        </motion.button>
      )}

      {/* Question input overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-[45] w-80"
          >
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(10,10,18,0.95)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(124,92,252,0.2)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
              }}
            >
              {!submitted ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-white/70 font-medium">Ask Steven a question</p>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-white/30 hover:text-white/60 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none text-white placeholder:text-white/25 resize-none border-none"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                    rows={3}
                    placeholder="Your question might be answered live..."
                    maxLength={300}
                    autoFocus
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] text-white/20">{question.length}/300</span>
                    <button
                      onClick={submit}
                      disabled={!question.trim()}
                      className="btn-accent text-xs px-4 py-1.5"
                      style={question.trim() ? { background: "rgba(124,92,252,0.6)" } : {}}
                    >
                      Submit
                    </button>
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-4"
                >
                  <span className="text-2xl mb-2 block">✨</span>
                  <p className="text-sm text-white/70">Question submitted!</p>
                  <p className="text-[10px] text-white/30 mt-1">Steven might answer it live</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WordData {
  word: string;
  count: number;
}

interface Props {
  eventId: string;
  viewerId: string;
}

export default function WordCloud({ eventId, viewerId }: Props) {
  const [words, setWords] = useState<WordData[]>([]);
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [totalResponses, setTotalResponses] = useState(0);

  const loadWords = useCallback(async () => {
    try {
      const res = await fetch(`/api/word-cloud?event_id=${eventId}`);
      const data = await res.json();
      if (data.words) setWords(data.words);
      if (data.responses) setTotalResponses(data.responses.length);
    } catch { /* ignore */ }
  }, [eventId]);

  useEffect(() => {
    loadWords();
    const interval = setInterval(loadWords, 5000);
    return () => clearInterval(interval);
  }, [loadWords]);

  const submit = useCallback(async () => {
    if (!input.trim() || submitted) return;
    setSubmitted(true);

    try {
      await fetch("/api/word-cloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          viewer_id: viewerId,
          response_text: input.trim(),
        }),
      });
      loadWords();
    } catch { /* ignore */ }
  }, [input, submitted, eventId, viewerId, loadWords]);

  const maxCount = Math.max(1, ...words.map(w => w.count));

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--room-gold)] font-medium mb-2">
        Moment Capture
      </p>
      <h2 className="text-lg font-semibold text-white/90 mb-4">
        What&apos;s the one thing you&apos;ll take away?
      </h2>

      {/* Input */}
      {!submitted ? (
        <div className="flex gap-2 mb-6">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none text-white placeholder:text-white/30 border-none"
            style={{ background: "rgba(255,255,255,0.08)" }}
            placeholder="One word or phrase..."
            maxLength={100}
          />
          <button
            onClick={submit}
            disabled={!input.trim()}
            className="btn-accent px-5"
          >
            Share
          </button>
        </div>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-white/50 mb-6"
        >
          Thanks for sharing.
        </motion.p>
      )}

      {/* Word Cloud Visualization */}
      <div className="flex flex-wrap items-center justify-center gap-2 py-4 min-h-[120px]">
        <AnimatePresence>
          {words.slice(0, 30).map((word, i) => {
            const scale = 0.7 + (word.count / maxCount) * 1.3;
            const opacity = 0.4 + (word.count / maxCount) * 0.6;

            return (
              <motion.span
                key={word.word}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="inline-block px-2 py-1 rounded-lg font-medium"
                style={{
                  fontSize: `${scale}rem`,
                  color: `rgba(255,255,255,${opacity})`,
                  background: `rgba(124,92,252,${0.05 + (word.count / maxCount) * 0.15})`,
                }}
              >
                {word.word}
                {word.count > 1 && (
                  <span className="text-[9px] ml-0.5 opacity-50">{word.count}</span>
                )}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>

      {totalResponses > 0 && (
        <p className="text-[10px] text-white/25 mt-2">
          {totalResponses.toLocaleString()} people shared
        </p>
      )}
    </div>
  );
}

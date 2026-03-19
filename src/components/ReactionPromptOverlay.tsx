"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ReactionPrompt {
  id: string;
  trigger_time_seconds: number;
  prompt_text: string;
  emoji_options: string[];
  duration_seconds: number;
  counts?: Record<string, number>;
}

interface Props {
  eventId: string;
  viewerId: string;
  currentTime: number;
  isLive: boolean;
}

export default function ReactionPromptOverlay({ eventId, viewerId, currentTime, isLive }: Props) {
  const [prompt, setPrompt] = useState<ReactionPrompt | null>(null);
  const [responded, setResponded] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const shownPrompts = useRef<Set<string>>(new Set());

  const checkPrompt = useCallback(async () => {
    if (!isLive || currentTime <= 0) return;

    try {
      const res = await fetch(
        `/api/reaction-prompts?event_id=${eventId}&current_time=${Math.floor(currentTime)}`
      );
      const data = await res.json();

      if (data.prompt && !shownPrompts.current.has(data.prompt.id)) {
        shownPrompts.current.add(data.prompt.id);
        setPrompt(data.prompt);
        setCounts(data.prompt.counts || {});
        setResponded(false);
        setSelectedEmoji(null);
      } else if (!data.prompt && prompt) {
        // Auto-dismiss when time window passes
        setPrompt(null);
      }
    } catch { /* ignore */ }
  }, [eventId, currentTime, isLive, prompt]);

  useEffect(() => {
    checkPrompt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(currentTime / 3)]);

  const respond = useCallback(async (emoji: string) => {
    if (!prompt || responded) return;
    setResponded(true);
    setSelectedEmoji(emoji);
    setCounts(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));

    try {
      await fetch("/api/reaction-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          prompt_id: prompt.id,
          event_id: eventId,
          viewer_id: viewerId,
          emoji,
        }),
      });
    } catch { /* ignore */ }
  }, [prompt, responded, eventId, viewerId]);

  const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <AnimatePresence>
      {prompt && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[35]"
        >
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 px-6 py-4 text-center shadow-2xl min-w-[280px]">
            <p className="text-sm text-white/90 font-medium mb-3">{prompt.prompt_text}</p>

            <div className="flex items-center justify-center gap-3">
              {prompt.emoji_options.map((emoji) => {
                const count = counts[emoji] || 0;
                const isSelected = selectedEmoji === emoji;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

                return (
                  <button
                    key={emoji}
                    onClick={() => respond(emoji)}
                    disabled={responded}
                    className="flex flex-col items-center gap-1 transition-transform"
                    style={{
                      transform: isSelected ? "scale(1.3)" : "scale(1)",
                      opacity: responded && !isSelected ? 0.5 : 1,
                    }}
                  >
                    <span className="text-2xl">{emoji}</span>
                    {responded && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10px] text-white/50 font-mono"
                      >
                        {pct}%
                      </motion.span>
                    )}
                  </button>
                );
              })}
            </div>

            {responded && totalVotes > 1 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] text-white/30 mt-2"
              >
                {totalVotes.toLocaleString()} responded
              </motion.p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState, useCallback, useRef } from "react";
import { REACTIONS, type ReactionEmoji } from "@/lib/types";

interface FloatingReaction {
  id: number;
  emoji: string;
  x: number;
}

interface Props {
  onReaction: (emoji: ReactionEmoji) => void;
  incomingReactions: FloatingReaction[];
}

export default function ReactionBar({ onReaction, incomingReactions }: Props) {
  const [lastSentAt, setLastSentAt] = useState(0);
  const [localReactions, setLocalReactions] = useState<FloatingReaction[]>([]);
  const idRef = useRef(0);

  const sendReaction = useCallback((emoji: ReactionEmoji) => {
    const now = Date.now();
    if (now - lastSentAt < 3000) return; // Rate limit: 1 per 3s
    setLastSentAt(now);
    onReaction(emoji);

    // Local animation
    const id = idRef.current++;
    const x = 20 + Math.random() * 60;
    setLocalReactions((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setLocalReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  }, [lastSentAt, onReaction]);

  const allReactions = [...incomingReactions, ...localReactions];

  return (
    <>
      {/* Floating reactions over the video */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {allReactions.map((r) => (
          <span
            key={r.id}
            className="floating-reaction"
            style={{ left: `${r.x}%`, bottom: "12%" }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {/* Reaction bar */}
      <div className="flex items-center justify-center gap-2 mt-3">
        {REACTIONS.map((r) => (
          <button
            key={r.emoji}
            onClick={() => sendReaction(r.emoji as ReactionEmoji)}
            className="reaction-btn"
            title={r.label}
          >
            {r.emoji}
          </button>
        ))}
      </div>
    </>
  );
}

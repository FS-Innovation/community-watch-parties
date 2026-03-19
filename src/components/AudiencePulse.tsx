"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

interface Props {
  eventId: string;
  isVisible: boolean;
}

export default function AudiencePulse({ eventId, isVisible }: Props) {
  const [intensity, setIntensity] = useState(0); // 0-1
  const [reactionCount, setReactionCount] = useState(0);

  const fetchPulse = useCallback(async () => {
    try {
      const res = await fetch(`/api/reactions?event_id=${eventId}&window=15`);
      const data = await res.json();
      const count = data.count || 0;
      setReactionCount(count);
      // Normalize: 0 reactions = 0, 50+ = 1.0
      setIntensity(Math.min(1, count / 50));
    } catch { /* ignore */ }
  }, [eventId]);

  useEffect(() => {
    if (!isVisible) return;
    fetchPulse();
    const interval = setInterval(fetchPulse, 5000);
    return () => clearInterval(interval);
  }, [fetchPulse, isVisible]);

  if (!isVisible) return null;

  // Color shifts with intensity: dim blue → warm amber → bright white
  const hue = 220 - intensity * 180; // 220 (blue) → 40 (amber)
  const saturation = 40 + intensity * 40;
  const lightness = 15 + intensity * 45;
  const opacity = 0.15 + intensity * 0.65;

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-1 z-[25] pointer-events-none"
      animate={{ opacity }}
      transition={{ duration: 1 }}
    >
      {/* Glow bar */}
      <div
        className="w-full h-full rounded-t-sm"
        style={{
          background: `linear-gradient(90deg,
            transparent 0%,
            hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity}) 20%,
            hsla(${hue}, ${saturation}%, ${lightness + 10}%, ${opacity + 0.1}) 50%,
            hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity}) 80%,
            transparent 100%)`,
          boxShadow: intensity > 0.3
            ? `0 -4px 20px hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity * 0.5})`
            : "none",
          transition: "all 1s ease",
        }}
      />

      {/* Pulse wave when high intensity */}
      {intensity > 0.5 && (
        <motion.div
          className="absolute inset-0"
          animate={{
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background: `linear-gradient(90deg, transparent, hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0.4), transparent)`,
          }}
        />
      )}
    </motion.div>
  );
}

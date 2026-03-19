"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  eventId: string;
  isVisible: boolean;
}

export default function ViewerCountTicker({ eventId, isVisible }: Props) {
  const [count, setCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [milestoneHit, setMilestoneHit] = useState<string | null>(null);
  const lastMilestone = useRef(0);

  // Fetch real count
  useEffect(() => {
    if (!isVisible) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/presence?event_id=${eventId}`);
        const data = await res.json();
        setCount(data.count || 0);
      } catch { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [eventId, isVisible]);

  // Animate count up smoothly
  useEffect(() => {
    if (count === displayCount) return;

    const diff = count - displayCount;
    const steps = Math.min(Math.abs(diff), 20);
    const stepSize = diff / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      setDisplayCount(prev => {
        const next = Math.round(prev + stepSize);
        return step >= steps ? count : next;
      });
      if (step >= steps) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, [count, displayCount]);

  // Check for milestones
  useEffect(() => {
    const milestones = [100, 250, 500, 1000, 2000, 3000, 5000];
    for (const m of milestones) {
      if (count >= m && lastMilestone.current < m) {
        lastMilestone.current = m;
        setMilestoneHit(`${m.toLocaleString()} viewers!`);
        setTimeout(() => setMilestoneHit(null), 4000);

        // Post to activity feed
        fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: eventId,
            type: "milestone",
            content: `${m.toLocaleString()} people watching!`,
          }),
        }).catch(() => {});
        break;
      }
    }
  }, [count, eventId]);

  if (!isVisible) return null;

  return (
    <div className="relative">
      {/* Main counter */}
      <motion.div
        className="text-center"
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <span className="font-mono text-sm text-white/40 tabular-nums">
          {displayCount.toLocaleString()}
        </span>
        <span className="text-[10px] text-white/20 ml-1.5">watching</span>
      </motion.div>

      {/* Milestone burst */}
      <AnimatePresence>
        {milestoneHit && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -30, scale: 1 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.5 }}
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{
                background: "rgba(180,140,60,0.2)",
                border: "1px solid rgba(180,140,60,0.3)",
                color: "rgba(180,140,60,0.9)",
              }}
            >
              {milestoneHit}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

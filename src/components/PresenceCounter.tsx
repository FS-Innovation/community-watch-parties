"use client";

import { useEffect, useState, useRef } from "react";
import { getViewerId } from "@/lib/viewer";

interface Props {
  eventId: string;
}

export default function PresenceCounter({ eventId }: Props) {
  const [count, setCount] = useState(0);
  const [bumping, setBumping] = useState(false);
  const prevCountRef = useRef(0);
  const viewerId = typeof window !== "undefined" ? getViewerId() : "";

  useEffect(() => {
    // Send heartbeat and poll count
    const heartbeatAndPoll = async () => {
      try {
        // Send heartbeat
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: eventId, viewer_id: viewerId }),
        });

        // Get count
        const res = await fetch(`/api/presence?event_id=${eventId}`);
        const data = await res.json();
        const newCount = data.count || 0;
        if (newCount !== prevCountRef.current) {
          setBumping(true);
          setTimeout(() => setBumping(false), 300);
        }
        prevCountRef.current = newCount;
        setCount(newCount);
      } catch { /* ignore */ }
    };
    heartbeatAndPoll();
    const interval = setInterval(heartbeatAndPoll, 10000);
    return () => clearInterval(interval);
  }, [eventId, viewerId]);

  return (
    <div className="presence-badge">
      <span className="presence-dot" />
      <span
        style={{
          transition: "transform 0.3s",
          transform: bumping ? "scale(1.15)" : "scale(1)",
          display: "inline-block",
        }}
      >
        {count.toLocaleString()} watching
      </span>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";

interface Props {
  eventId: string;
}

export default function PresenceCounter({ eventId }: Props) {
  const [count, setCount] = useState(0);
  const [bumping, setBumping] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    // In production: use Supabase Realtime Presence
    // supabase.channel(`presence:${eventId}`).on('presence', { event: 'sync' }, () => { ... })
    //
    // For now: poll a simple presence endpoint
    const poll = async () => {
      try {
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
    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [eventId]);

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

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const TOTAL_SPOTS = 100;

export default function ThresholdCounter() {
  const [claimed, setClaimed] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true });
      setClaimed(count ?? 0);
    }

    fetchCount();

    // Subscribe to realtime inserts
    const channel = supabase
      .channel("registrations-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "registrations" },
        () => {
          setClaimed((prev) => (prev !== null ? prev + 1 : 1));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (claimed === null) return null;

  const percentage = Math.min((claimed / TOTAL_SPOTS) * 100, 100);
  const isFull = claimed >= TOTAL_SPOTS;

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in-delay">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm font-medium tracking-wide uppercase text-[var(--doac-text-muted)]">
          {isFull ? "Event Full" : "Spots Claimed"}
        </span>
        <span className="text-lg font-semibold">
          <span className="text-[var(--doac-orange)]">{claimed}</span>
          <span className="text-[var(--doac-text-muted)]">
            {" "}
            of {TOTAL_SPOTS}
          </span>
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-[var(--doac-dark)] border border-[var(--doac-border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${percentage}%`,
            background: isFull
              ? "#ef4444"
              : "linear-gradient(90deg, var(--doac-orange), #f59e0b)",
          }}
        />
      </div>
      {isFull && (
        <p className="text-center text-sm text-red-400 mt-2">
          All spots have been claimed. Join the waitlist below.
        </p>
      )}
    </div>
  );
}

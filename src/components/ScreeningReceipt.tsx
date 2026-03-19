"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { ScreeningReceipt as ReceiptType } from "@/lib/types";

interface Props {
  viewerId: string;
  eventId: string;
  viewerCount: number;
}

export default function ScreeningReceipt({ viewerId, eventId, viewerCount }: Props) {
  const [receipt, setReceipt] = useState<ReceiptType | null>(null);

  const loadReceipt = useCallback(async () => {
    try {
      const res = await fetch(`/api/receipts?viewer_id=${viewerId}&event_id=${eventId}`);
      const data = await res.json();
      if (data.receipts && data.receipts.length > 0) {
        setReceipt(data.receipts[0]);
      }
    } catch { /* ignore */ }
  }, [viewerId, eventId]);

  useEffect(() => {
    loadReceipt();
  }, [loadReceipt]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="w-full max-w-sm mx-auto"
    >
      <div
        className="rounded-2xl overflow-hidden border border-white/10"
        style={{
          background: "linear-gradient(165deg, rgba(26,26,46,0.9), rgba(15,15,23,0.95))",
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-white/5">
          <p className="text-[9px] tracking-[0.3em] uppercase text-white/30 font-medium mb-1">
            Screening Receipt
          </p>
          <h3 className="text-lg font-bold text-white/90">
            {receipt?.episode_title || "Behind The Diary"}
          </h3>
          {receipt?.episode_number && (
            <p className="text-xs text-white/40 mt-0.5">Episode {receipt.episode_number}</p>
          )}
        </div>

        {/* Stats */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Watched with</span>
            <span className="text-sm font-mono text-white/80">
              {(receipt?.viewer_count || viewerCount).toLocaleString()} people
            </span>
          </div>

          {receipt?.connection_room && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Connection Room</span>
              <span className="text-sm text-white/80">{receipt.connection_room}</span>
            </div>
          )}

          {receipt?.watch_duration_seconds && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Watch time</span>
              <span className="text-sm font-mono text-white/80">
                {Math.round(receipt.watch_duration_seconds / 60)} min
              </span>
            </div>
          )}

          {(receipt?.reaction_count || 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Reactions</span>
              <span className="text-sm font-mono text-white/80">{receipt?.reaction_count}</span>
            </div>
          )}

          {(receipt?.chat_count || 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Messages</span>
              <span className="text-sm font-mono text-white/80">{receipt?.chat_count}</span>
            </div>
          )}
        </div>

        {/* Badges */}
        {receipt?.badges_earned && receipt.badges_earned.length > 0 && (
          <div className="px-6 py-3 border-t border-white/5">
            <p className="text-[9px] tracking-[0.15em] uppercase text-white/30 mb-2">Badges Earned</p>
            <div className="flex flex-wrap gap-2">
              {receipt.badges_earned.map((badge, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full border border-white/10"
                  style={{ background: "rgba(124,92,252,0.15)" }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Takeaway */}
        {receipt?.takeaway_text && (
          <div className="px-6 py-3 border-t border-white/5">
            <p className="text-[9px] tracking-[0.15em] uppercase text-white/30 mb-1">Your takeaway</p>
            <p className="text-sm text-white/70 italic">&ldquo;{receipt.takeaway_text}&rdquo;</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 text-center">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/20">
            Behind The Diary &mdash; DOAC Passport
          </p>
          <p className="text-[9px] text-white/15 mt-1 font-mono">
            {new Date(receipt?.created_at || Date.now()).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

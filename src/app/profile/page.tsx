"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getViewerId, getViewerName } from "@/lib/viewer";
import type { ViewerProfile, ViewerBadge, ScreeningReceipt, Badge } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ViewerProfile | null>(null);
  const [badges, setBadges] = useState<(ViewerBadge & { badge?: Badge })[]>([]);
  const [receipts, setReceipts] = useState<ScreeningReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const viewerId = typeof window !== "undefined" ? getViewerId() : "";

  const loadProfile = useCallback(async () => {
    if (!viewerId) return;
    try {
      const res = await fetch(`/api/profile?viewer_id=${viewerId}`);
      const data = await res.json();
      setProfile(data.profile);
      setBadges(data.badges || []);
      setReceipts(data.receipts || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [viewerId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--room-bg)]">
        <p className="text-sm text-[var(--room-text-muted)]">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-[var(--room-bg)]">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--room-gold)] font-medium mb-1">
              DOAC Passport
            </p>
            <h1 className="text-2xl font-bold">
              {profile?.display_name || getViewerName() || "Viewer"}
            </h1>
            {profile?.location && (
              <p className="text-sm text-[var(--room-text-muted)] mt-0.5">
                {profile.location}
              </p>
            )}
          </div>
          <Link href="/" className="text-xs text-[var(--room-accent)] hover:underline">
            Back to screening
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Screenings", value: profile?.total_screenings || receipts.length },
            { label: "Reactions", value: profile?.total_reactions || 0 },
            { label: "Messages", value: profile?.total_chat_messages || 0 },
            { label: "Breakout min", value: Math.round(profile?.total_breakout_minutes || 0) },
          ].map((stat) => (
            <div key={stat.label} className="admin-card text-center">
              <p className="text-lg font-bold font-mono">{stat.value}</p>
              <p className="text-[9px] text-[var(--room-text-muted)] tracking-wider uppercase mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="admin-card mb-6">
          <h2 className="text-sm font-semibold text-[var(--room-accent)] mb-4">Collectibles</h2>

          {badges.length === 0 ? (
            <p className="text-xs text-[var(--room-text-muted)]">
              No badges yet. Attend a screening to earn your first!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((vb) => (
                <motion.div
                  key={vb.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--room-border)]"
                  style={{ background: "rgba(124,92,252,0.05)" }}
                >
                  <span className="text-2xl">{vb.badge?.icon || "🏅"}</span>
                  <div>
                    <p className="text-xs font-medium">{vb.badge?.name || "Badge"}</p>
                    <p className="text-[9px] text-[var(--room-text-muted)]">
                      {vb.badge?.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Screening History */}
        <div className="admin-card">
          <h2 className="text-sm font-semibold text-[var(--room-accent)] mb-4">Screening History</h2>

          {receipts.length === 0 ? (
            <p className="text-xs text-[var(--room-text-muted)]">
              No screenings yet.
            </p>
          ) : (
            <div className="space-y-3">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--room-bg)] border border-[var(--room-border)]"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {receipt.episode_title || `Episode ${receipt.episode_number || "?"}`}
                    </p>
                    <p className="text-[10px] text-[var(--room-text-muted)]">
                      {new Date(receipt.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                      {receipt.viewer_count && (
                        <span> &middot; {receipt.viewer_count.toLocaleString()} viewers</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {receipt.badges_earned?.slice(0, 3).map((b, i) => (
                      <span key={i} className="text-sm">{b}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

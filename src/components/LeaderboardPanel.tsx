"use client";

import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
}

export default function LeaderboardPanel({ entries }: LeaderboardPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--doac-border)]">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-[var(--doac-text-muted)]">
          Leaderboard
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {entries.length === 0 && (
          <p className="text-sm text-[var(--doac-text-muted)] text-center py-8">
            Participate in chat and polls to earn points and climb the
            leaderboard.
          </p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              entry.rank <= 5
                ? "bg-[rgba(232,115,74,0.08)] border border-[var(--doac-border)]"
                : ""
            }`}
          >
            <span
              className={`text-lg font-bold w-8 text-center ${
                entry.rank === 1
                  ? "text-yellow-400"
                  : entry.rank === 2
                    ? "text-gray-300"
                    : entry.rank === 3
                      ? "text-amber-600"
                      : "text-[var(--doac-text-muted)]"
              }`}
            >
              {entry.rank}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.user_name}</p>
            </div>
            <span className="text-sm font-semibold text-[var(--doac-orange)]">
              {entry.score}
            </span>
          </div>
        ))}
      </div>

      {/* Meet Steven CTA for top 5 */}
      <div className="px-4 py-3 border-t border-[var(--doac-border)]">
        <p className="text-xs text-center text-[var(--doac-text-muted)]">
          Top 5 at the end of the show get to meet Steven
        </p>
      </div>
    </div>
  );
}

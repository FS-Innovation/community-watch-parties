"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import VideoPlayer from "@/components/VideoPlayer";
import ChatPanel from "@/components/ChatPanel";
import LeaderboardPanel from "@/components/LeaderboardPanel";
import type { LeaderboardEntry } from "@/lib/types";

interface UserData {
  id: string;
  name: string;
  email: string;
}

// Demo leaderboard data
const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { user_id: "1", user_name: "Sarah M.", score: 340, rank: 1 },
  { user_id: "2", user_name: "James K.", score: 285, rank: 2 },
  { user_id: "3", user_name: "Priya R.", score: 220, rank: 3 },
  { user_id: "4", user_name: "Alex T.", score: 195, rank: 4 },
  { user_id: "5", user_name: "Morgan L.", score: 150, rank: 5 },
];

export default function WatchRoom() {
  const params = useParams();
  const token = params.token as string;
  const [user, setUser] = useState<UserData | null>(null);
  const [status, setStatus] = useState<"loading" | "authorized" | "denied">(
    "loading"
  );

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch("/api/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          setStatus("denied");
          return;
        }

        const data = await res.json();
        setUser(data.user);
        setStatus("authorized");
      } catch {
        setStatus("denied");
      }
    }

    verify();
  }, [token]);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[var(--doac-orange)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--doac-text-muted)]">
            Verifying your access...
          </p>
        </div>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
          <p className="text-[var(--doac-text-muted)] mb-6">
            This access token is invalid or has expired. Please check your email
            for the correct link.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg bg-[var(--doac-orange)] text-white font-medium hover:brightness-110 transition-all"
          >
            Register for a Watch Party
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-[var(--doac-darker)]">
      {/* Background ambient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(232,115,74,0.06) 0%, transparent 60%)",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-[var(--doac-border)] bg-[var(--doac-panel)]">
        <div className="flex items-center gap-3">
          <span className="text-xs tracking-[0.2em] uppercase text-[var(--doac-orange)] font-medium">
            DOAC
          </span>
          <span className="text-xs text-[var(--doac-text-muted)]">
            Watch Party
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-[var(--doac-text-muted)]">
            {user?.name}
          </span>
        </div>
      </header>

      {/* 3-zone layout */}
      <div className="relative z-10 flex-1 flex min-h-0">
        {/* Zone 2 — Left Side Screen (Chat) */}
        <aside className="w-80 flex-shrink-0 glass-panel border-r border-[var(--doac-border)] hidden lg:flex flex-col">
          <ChatPanel userName={user?.name || "Guest"} />
        </aside>

        {/* Zone 1 — Main Stage (Centre Screen) */}
        <section className="flex-1 flex items-center justify-center p-6 min-w-0">
          <div className="w-full max-w-4xl aspect-video">
            <VideoPlayer />
          </div>
        </section>

        {/* Zone 2 — Right Side Screen (Leaderboard) */}
        <aside className="w-72 flex-shrink-0 glass-panel border-l border-[var(--doac-border)] hidden lg:flex flex-col">
          <LeaderboardPanel entries={DEMO_LEADERBOARD} />
        </aside>
      </div>

      {/* Mobile bottom bar (chat + leaderboard toggles) */}
      <div className="lg:hidden relative z-10 flex border-t border-[var(--doac-border)] bg-[var(--doac-panel)]">
        <button className="flex-1 py-3 text-sm text-center text-[var(--doac-text-muted)] hover:text-[var(--doac-orange)] transition-colors cursor-pointer">
          Chat
        </button>
        <button className="flex-1 py-3 text-sm text-center text-[var(--doac-text-muted)] hover:text-[var(--doac-orange)] transition-colors cursor-pointer">
          Leaderboard
        </button>
      </div>
    </main>
  );
}

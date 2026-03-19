"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Game {
  id: string;
  option_a: string;
  option_b: string;
  votes_a: number;
  votes_b: number;
}

interface Props {
  eventId: string;
  viewerId: string;
  phase: "lobby" | "afterparty";
}

export default function ThisOrThatGame({ eventId, viewerId, phase }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [voted, setVoted] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});

  const loadGames = useCallback(async () => {
    try {
      const res = await fetch(`/api/this-or-that?event_id=${eventId}&phase=${phase}`);
      const data = await res.json();
      if (data.games) setGames(data.games);
    } catch { /* ignore */ }
  }, [eventId, phase]);

  useEffect(() => {
    loadGames();
    const interval = setInterval(loadGames, 10000);
    return () => clearInterval(interval);
  }, [loadGames]);

  const vote = useCallback(async (gameId: string, choice: "a" | "b") => {
    if (voted[gameId]) return;

    setVoted(prev => ({ ...prev, [gameId]: choice }));
    setShowResults(prev => ({ ...prev, [gameId]: true }));

    // Optimistic update
    setGames(prev => prev.map(g => {
      if (g.id !== gameId) return g;
      return {
        ...g,
        votes_a: g.votes_a + (choice === "a" ? 1 : 0),
        votes_b: g.votes_b + (choice === "b" ? 1 : 0),
      };
    }));

    try {
      await fetch("/api/this-or-that", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote",
          game_id: gameId,
          event_id: eventId,
          viewer_id: viewerId,
          choice,
        }),
      });
    } catch { /* ignore */ }

    // Auto-advance after 3s
    setTimeout(() => {
      setCurrentIndex(prev => Math.min(prev + 1, games.length - 1));
    }, 3000);
  }, [voted, eventId, viewerId, games.length]);

  if (games.length === 0) return null;

  const game = games[currentIndex];
  if (!game) return null;

  const totalVotes = game.votes_a + game.votes_b;
  const pctA = totalVotes > 0 ? Math.round((game.votes_a / totalVotes) * 100) : 50;
  const pctB = totalVotes > 0 ? Math.round((game.votes_b / totalVotes) * 100) : 50;
  const hasVoted = !!voted[game.id];
  const showing = showResults[game.id];

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: "#a78bfa" }}>
          This or That
        </span>
        <span className="text-[9px] text-white/30">
          {currentIndex + 1} / {games.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={game.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="rounded-xl overflow-hidden border border-white/10"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          {/* Option A */}
          <button
            onClick={() => vote(game.id, "a")}
            disabled={hasVoted}
            className="relative w-full text-left px-5 py-4 transition-all hover:bg-white/5 disabled:cursor-default"
          >
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-sm font-medium text-white/90">{game.option_a}</span>
              {showing && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-mono text-white/50"
                >
                  {pctA}%
                </motion.span>
              )}
            </div>
            {showing && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctA}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 rounded-r"
                style={{
                  background: voted[game.id] === "a"
                    ? "rgba(124,92,252,0.25)"
                    : "rgba(255,255,255,0.06)",
                }}
              />
            )}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-0">
            <div className="absolute inset-x-0 h-px bg-white/10" />
            <span className="relative bg-[var(--room-surface)] px-3 text-[10px] text-white/30 font-semibold tracking-wider">
              OR
            </span>
          </div>

          {/* Option B */}
          <button
            onClick={() => vote(game.id, "b")}
            disabled={hasVoted}
            className="relative w-full text-left px-5 py-4 transition-all hover:bg-white/5 disabled:cursor-default"
          >
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-sm font-medium text-white/90">{game.option_b}</span>
              {showing && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-mono text-white/50"
                >
                  {pctB}%
                </motion.span>
              )}
            </div>
            {showing && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctB}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 rounded-r"
                style={{
                  background: voted[game.id] === "b"
                    ? "rgba(124,92,252,0.25)"
                    : "rgba(255,255,255,0.06)",
                }}
              />
            )}
          </button>
        </motion.div>
      </AnimatePresence>

      {showing && totalVotes > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] text-white/25 text-center mt-2"
        >
          {totalVotes.toLocaleString()} votes
        </motion.p>
      )}
    </div>
  );
}

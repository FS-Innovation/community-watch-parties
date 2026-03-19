"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WordCloud from "./WordCloud";
import ScreeningReceipt from "./ScreeningReceipt";
import ThisOrThatGame from "./ThisOrThatGame";
import ShareReceipt from "./ShareReceipt";

interface Props {
  eventId: string;
  viewerId: string;
  viewerCount: number;
  displayName: string;
}

type AfterpartyPhase = "applause" | "word_cloud" | "receipt" | "connect";

export default function AfterpartyExperience({ eventId, viewerId, viewerCount, displayName }: Props) {
  const [phase, setPhase] = useState<AfterpartyPhase>("applause");
  const [applauseEmojis, setApplauseEmojis] = useState<Array<{ id: number; emoji: string; x: number; y: number }>>([]);

  // Applause: show burst of emojis
  const triggerApplause = useCallback(() => {
    const emojis = ["👏", "🔥", "❤️", "🙌", "⭐", "✨"];
    const burst = Array.from({ length: 30 }, (_, i) => ({
      id: Date.now() + i,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
    }));
    setApplauseEmojis(burst);

    setTimeout(() => {
      setPhase("word_cloud");
    }, 5000);
  }, []);

  // Auto-start applause
  useState(() => {
    setTimeout(triggerApplause, 1000);
  });

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* Applause emojis floating */}
      <div className="absolute inset-0 pointer-events-none z-[30]">
        <AnimatePresence>
          {applauseEmojis.map((e) => (
            <motion.span
              key={e.id}
              initial={{ opacity: 0, scale: 0, x: `${e.x}vw`, y: `${e.y}vh` }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0, 1.5, 1.5, 0],
                y: `${e.y - 30}vh`,
              }}
              transition={{ duration: 3, times: [0, 0.2, 0.7, 1] }}
              className="absolute text-3xl pointer-events-none"
              style={{ left: `${e.x}%` }}
            >
              {e.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── Applause Phase ─── */}
        {phase === "applause" && (
          <motion.div
            key="applause"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center z-10"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--room-gold)] font-medium mb-3">
                Standing Ovation
              </p>
              <h1 className="text-3xl font-bold text-white/90 mb-2">
                Thank you for being here
              </h1>
              <p className="text-sm text-white/50">
                {viewerCount.toLocaleString()} people just shared this moment
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* ─── Word Cloud Phase ─── */}
        {phase === "word_cloud" && (
          <motion.div
            key="word_cloud"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-10 w-full px-4"
          >
            <WordCloud eventId={eventId} viewerId={viewerId} />

            <div className="mt-6">
              <ThisOrThatGame eventId={eventId} viewerId={viewerId} phase="afterparty" />
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => setPhase("receipt")}
                className="btn-ghost text-xs"
              >
                View your screening receipt
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Receipt Phase ─── */}
        {phase === "receipt" && (
          <motion.div
            key="receipt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-10 w-full px-4"
          >
            <ScreeningReceipt
              viewerId={viewerId}
              eventId={eventId}
              viewerCount={viewerCount}
            />

            {/* Share receipt */}
            <ShareReceipt
              episodeTitle="Behind The Diary"
              viewerCount={viewerCount}
              eventId={eventId}
            />

            <div className="text-center mt-6 space-y-3">
              <button
                onClick={() => setPhase("connect")}
                className="btn-accent text-sm px-6"
              >
                Stay connected
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Connect Phase ─── */}
        {phase === "connect" && (
          <motion.div
            key="connect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-10 text-center px-4"
          >
            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--room-gold)] font-medium mb-3">
              Keep the conversation going
            </p>
            <h2 className="text-xl font-bold text-white/90 mb-6">
              Join the community
            </h2>

            <div className="space-y-3 max-w-xs mx-auto">
              <a
                href="#"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-white/90 transition-colors"
                style={{ background: "rgba(37, 211, 102, 0.2)", border: "1px solid rgba(37, 211, 102, 0.3)" }}
              >
                <span>💬</span> Join WhatsApp Group
              </a>
              <a
                href="#"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-white/90 transition-colors"
                style={{ background: "rgba(88, 101, 242, 0.2)", border: "1px solid rgba(88, 101, 242, 0.3)" }}
              >
                <span>🎮</span> Join Discord Server
              </a>
              <a
                href="#"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-white/90 transition-colors"
                style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
              >
                <span>🎫</span> View DOAC Passport
              </a>
            </div>

            <p className="text-[10px] text-white/20 mt-6">
              See you at the next screening.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

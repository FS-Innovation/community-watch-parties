"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CommunitySegmentFlow from "@/components/CommunitySegmentFlow";
import { getPreShowPhase, PHASE_LABELS } from "@/lib/preshow";
import type { PreShowPhase } from "@/lib/types";

interface Props {
  eventId: string;
  viewerId: string;
  countdownStart: number | null;
  countdownDuration: number;
  onComplete: () => void;
  onCardChange?: (prompt: string, author: string) => void;
  onPhaseChange?: (phase: PreShowPhase) => void;
}

export default function PreShowExperience({
  eventId,
  viewerId,
  countdownStart,
  countdownDuration,
  onComplete,
  onCardChange,
  onPhaseChange,
}: Props) {
  const [timeLeft, setTimeLeft] = useState(countdownDuration);
  const [fullscreenDismissed, setFullscreenDismissed] = useState(false);
  const [silenceCardVisible, setSilenceCardVisible] = useState(false);
  const [silenceCardShown, setSilenceCardShown] = useState(false);

  // Countdown tick
  useEffect(() => {
    if (!countdownStart) return;
    const tick = () => {
      const elapsed = (Date.now() - countdownStart) / 1000;
      setTimeLeft(Math.max(0, countdownDuration - elapsed));
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [countdownStart, countdownDuration]);

  const phase = useMemo(() => getPreShowPhase(timeLeft), [timeLeft]);

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  // Silence phase: show "silence your phone" card for 5s
  useEffect(() => {
    if (phase === "silence" && !silenceCardShown) {
      setSilenceCardShown(true);
      setSilenceCardVisible(true);
      const timer = setTimeout(() => setSilenceCardVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [phase, silenceCardShown]);

  // Curtain phase: auto-trigger live transition
  useEffect(() => {
    if (phase === "curtain") {
      // Small delay for the flash animation, then go live
      const timer = setTimeout(() => onComplete(), 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const requestFullscreen = useCallback(() => {
    try {
      document.documentElement.requestFullscreen?.();
    } catch { /* ignore */ }
    setFullscreenDismissed(true);
  }, []);

  // Phase-driven background opacity for the giant countdown
  const countdownOpacity = phase === "arrival" ? 0.04 : phase === "warmup" ? 0.06 : phase === "build" ? 0.12 : 0;
  const countdownScale = phase === "build" ? 1.1 : 1;

  // During silence + curtain, override all content
  const showSilenceOverlay = phase === "silence" || phase === "curtain";

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* ─── Giant Background Countdown ─── */}
      {timeLeft > 0 && !showSilenceOverlay && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
          animate={{ opacity: countdownOpacity, scale: countdownScale }}
          transition={{ duration: 2, ease: "easeInOut" }}
        >
          <span
            className="font-mono font-bold text-[var(--room-text)] leading-none"
            style={{ fontSize: "clamp(8rem, 25vw, 20rem)" }}
          >
            {formatTime(timeLeft)}
          </span>
        </motion.div>
      )}

      {/* ─── Phase Label (subtle) ─── */}
      {!showSilenceOverlay && (
        <motion.div
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10"
        >
          <span className="text-[9px] tracking-[0.25em] uppercase text-[var(--room-text-muted)] font-medium">
            {PHASE_LABELS[phase]}
          </span>
        </motion.div>
      )}

      {/* ─── Main Content (segmentation flow) ─── */}
      <AnimatePresence mode="wait">
        {!showSilenceOverlay ? (
          <motion.div
            key="content"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            className="relative z-[5] w-full h-full flex items-center justify-center"
          >
            <CommunitySegmentFlow
              eventId={eventId}
              viewerId={viewerId}
              countdownStart={countdownStart}
              countdownDuration={countdownDuration}
              onComplete={onComplete}
              onCardChange={onCardChange}
            />
          </motion.div>
        ) : (
          /* ─── Silence / Curtain Phase ─── */
          <motion.div
            key="silence"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="relative z-[5] flex flex-col items-center justify-center gap-8"
          >
            {/* "Silence your phone" card */}
            <AnimatePresence>
              {silenceCardVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.6 } }}
                  className="text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-[var(--room-border)] flex items-center justify-center">
                    <svg className="w-7 h-7 text-[var(--room-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-[var(--room-text)] mb-1">Silence your phone</p>
                  <p className="text-xs text-[var(--room-text-muted)]">The screening is about to begin</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fullscreen prompt */}
            <AnimatePresence>
              {!fullscreenDismissed && !silenceCardVisible && phase === "silence" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <p className="text-sm text-[var(--room-text-secondary)] mb-4">For the best experience</p>
                  <button
                    onClick={requestFullscreen}
                    className="btn-accent px-6 py-3 text-sm"
                  >
                    Go full screen
                  </button>
                  <button
                    onClick={() => setFullscreenDismissed(true)}
                    className="block mx-auto mt-3 text-[10px] text-[var(--room-text-muted)] hover:text-[var(--room-text)] transition-colors"
                  >
                    Skip
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Clean countdown — last 10s this is all that shows */}
            <motion.div
              animate={{
                scale: timeLeft <= 10 ? 1.2 : 1,
                opacity: timeLeft <= 10 ? 1 : 0.8,
              }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <span
                className="font-mono font-bold text-[var(--room-text)] block"
                style={{ fontSize: timeLeft <= 10 ? "clamp(4rem, 12vw, 8rem)" : "clamp(2rem, 6vw, 4rem)" }}
              >
                {formatTime(timeLeft)}
              </span>
            </motion.div>

            {/* Curtain rise flash */}
            <AnimatePresence>
              {phase === "curtain" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.4, 0], transition: { duration: 1, times: [0, 0.3, 1] } }}
                  className="fixed inset-0 bg-white z-[55] pointer-events-none"
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Build phase: subtle background darkening ─── */}
      <AnimatePresence>
        {phase === "build" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background: "radial-gradient(ellipse 70% 80% at center, transparent 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.7) 100%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── Silence phase: darker background ─── */}
      <AnimatePresence>
        {showSilenceOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 5 }}
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{ background: "rgba(0,0,0,0.5)" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

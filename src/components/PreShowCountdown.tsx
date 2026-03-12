"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  countdownStart: number;     // epoch ms when countdown began
  countdownDuration: number;  // total seconds (e.g. 300 = 5 min)
  onComplete: () => void;
}

export default function PreShowCountdown({ countdownStart, countdownDuration, onComplete }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(countdownDuration);
  const [phase, setPhase] = useState<"anticipation" | "final" | "go">("anticipation");

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - countdownStart) / 1000;
      const remaining = Math.max(0, countdownDuration - elapsed);
      setSecondsLeft(Math.ceil(remaining));

      if (remaining <= 10 && remaining > 0) {
        setPhase("final");
      } else if (remaining <= 0) {
        setPhase("go");
        setTimeout(onComplete, 2000);
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [countdownStart, countdownDuration, onComplete]);

  const progress = 1 - secondsLeft / countdownDuration;
  // Lights dim from 1.0 → 0.05 as countdown progresses
  const lightsOpacity = Math.max(0.05, 1 - progress * 0.95);
  // Background shifts from warm ambient → dark cinema
  const bgDarkness = Math.min(0.95, progress * 0.95);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden">
      {/* Dimming background layer */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, rgba(15, 12, 8, ${bgDarkness * 0.85}) 0%, rgba(5, 3, 1, ${bgDarkness}) 100%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />

      {/* Warm ambient glow that fades as lights dim */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(255, 180, 80, 0.08) 0%, transparent 70%)",
          opacity: lightsOpacity,
        }}
      />

      {/* Subtle cinema screen glow at center */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: "60vw",
          height: "34vw",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse, rgba(255, 255, 255, 0.02) 0%, transparent 70%)",
          opacity: bgDarkness,
        }}
      />

      <AnimatePresence mode="wait">
        {phase === "anticipation" && (
          <motion.div
            key="anticipation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 text-center max-w-lg mx-4"
          >
            {/* Top label */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[10px] tracking-[0.3em] uppercase font-medium mb-8"
              style={{ color: "var(--room-gold)" }}
            >
              The Diary of a CEO
            </motion.p>

            {/* Main message */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-3xl md:text-4xl font-bold mb-3 leading-tight"
              style={{ color: `rgba(255, 255, 255, ${Math.max(0.6, lightsOpacity)})` }}
            >
              Your screening starts soon
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-sm mb-12"
              style={{ color: `rgba(255, 255, 255, ${Math.max(0.3, lightsOpacity * 0.5)})` }}
            >
              Grab your drink, get comfortable — the lights are dimming.
            </motion.p>

            {/* Countdown timer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 }}
              className="inline-flex flex-col items-center"
            >
              <div
                className="text-6xl md:text-7xl font-mono font-bold tracking-wider mb-3 tabular-nums"
                style={{
                  color: secondsLeft <= 60
                    ? "var(--room-gold)"
                    : `rgba(255, 255, 255, ${Math.max(0.5, lightsOpacity * 0.8)})`,
                  textShadow: secondsLeft <= 60
                    ? "0 0 30px rgba(255, 180, 80, 0.3)"
                    : "none",
                  transition: "color 1s ease, text-shadow 1s ease",
                }}
              >
                {timeString}
              </div>

              {/* Progress bar */}
              <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress * 100}%`,
                    background: secondsLeft <= 60
                      ? "var(--room-gold)"
                      : "rgba(255, 255, 255, 0.25)",
                    transition: "background 1s ease",
                  }}
                />
              </div>

              <p
                className="text-[10px] tracking-[0.2em] uppercase mt-4"
                style={{ color: "rgba(255, 255, 255, 0.25)" }}
              >
                {secondsLeft > 60 ? "Until showtime" : "Almost there..."}
              </p>
            </motion.div>

            {/* Viewer presence hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="mt-12 flex items-center justify-center gap-2"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "var(--room-green)",
                  animation: "pulse-dot 1.5s infinite",
                }}
              />
              <span style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "11px" }}>
                Everyone is taking their seats
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* Final 10 second countdown */}
        {phase === "final" && (
          <motion.div
            key="final"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="relative z-10 text-center"
          >
            <motion.div
              key={secondsLeft}
              initial={{ opacity: 0, scale: 1.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
              className="text-8xl md:text-9xl font-bold tabular-nums"
              style={{
                color: "var(--room-gold)",
                textShadow: "0 0 60px rgba(255, 180, 80, 0.4), 0 0 120px rgba(255, 180, 80, 0.15)",
              }}
            >
              {secondsLeft}
            </motion.div>
          </motion.div>
        )}

        {/* GO moment */}
        {phase === "go" && (
          <motion.div
            key="go"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 text-center"
          >
            <p
              className="text-xs tracking-[0.4em] uppercase font-medium"
              style={{ color: "var(--room-gold)" }}
            >
              Enjoy the show
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import type { PreShowPhase } from "@/lib/types";

interface Props {
  phase: PreShowPhase;
  eventStatus: string;
}

// PRD: warm amber (Arrival) → deep blue (The Build) → near-black (Silence) → screen illumination (Live)
const PHASE_COLORS: Record<string, { bg: string; glow: string; opacity: number }> = {
  arrival: {
    bg: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(180,120,50,0.08) 0%, rgba(8,8,12,0) 70%)",
    glow: "rgba(180,120,50,0.06)",
    opacity: 1,
  },
  warmup: {
    bg: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(140,100,60,0.06) 0%, rgba(8,8,12,0) 70%)",
    glow: "rgba(140,100,60,0.04)",
    opacity: 1,
  },
  build: {
    bg: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(40,60,120,0.1) 0%, rgba(8,8,12,0) 70%)",
    glow: "rgba(40,60,120,0.08)",
    opacity: 1,
  },
  silence: {
    bg: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(5,5,10,0.3) 0%, rgba(2,2,4,0) 70%)",
    glow: "rgba(5,5,10,0.2)",
    opacity: 0.4,
  },
  curtain: {
    bg: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0.03) 0%, rgba(8,8,12,0) 70%)",
    glow: "rgba(255,255,255,0.02)",
    opacity: 0.6,
  },
  live: {
    bg: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(255,255,255,0.02) 0%, rgba(8,8,12,0) 60%)",
    glow: "rgba(255,255,255,0.01)",
    opacity: 1,
  },
  afterparty: {
    bg: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(124,92,252,0.06) 0%, rgba(8,8,12,0) 70%)",
    glow: "rgba(124,92,252,0.04)",
    opacity: 1,
  },
};

export default function AmbientLighting({ phase, eventStatus }: Props) {
  const key = eventStatus === "afterparty" ? "afterparty" : eventStatus === "live" ? "live" : phase;
  const colors = PHASE_COLORS[key] || PHASE_COLORS.arrival;

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-[2]"
      animate={{
        opacity: colors.opacity,
      }}
      transition={{ duration: 3, ease: "easeInOut" }}
    >
      {/* Main ambient glow */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: colors.bg,
        }}
        transition={{ duration: 4, ease: "easeInOut" }}
      />

      {/* Edge vignette — always present, deepens in silence */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,${phase === "silence" ? 0.7 : 0.3}) 100%)`,
          transition: "background 3s ease",
        }}
      />

      {/* Top edge warm strip (cinema ceiling light feel) */}
      {(phase === "arrival" || phase === "warmup") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2 }}
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: "linear-gradient(90deg, transparent 10%, rgba(180,140,60,0.15) 30%, rgba(180,140,60,0.2) 50%, rgba(180,140,60,0.15) 70%, transparent 90%)",
          }}
        />
      )}
    </motion.div>
  );
}

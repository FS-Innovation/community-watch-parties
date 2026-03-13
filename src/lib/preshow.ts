import type { PreShowPhase } from "./types";

// Phase boundaries (seconds remaining on countdown)
// 10:00 → 7:00 = Arrival (3 min — take your seat, say hello)
// 7:00 → 1:00 = Warmup (6 min — conversation cards + chat)
// 1:00 → 0:30 = Build (30s — anticipation)
// 0:30 → 0:00 = Silence (30s — hush)
// 0:00 = Curtain rise → Live

export function getPreShowPhase(timeLeft: number): PreShowPhase {
  if (timeLeft <= 0) return "curtain";
  if (timeLeft <= 30) return "silence";   // last 30s
  if (timeLeft <= 60) return "build";     // 0:30-1:00
  if (timeLeft <= 420) return "warmup";   // 1:00-7:00
  return "arrival";                        // 7:00+
}

export const PHASE_LABELS: Record<PreShowPhase, string> = {
  arrival: "Arrival",
  warmup: "Warm-Up",
  build: "The Build",
  silence: "Silence",
  curtain: "Curtain Rise",
  live: "Live",
};

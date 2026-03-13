import type { PreShowPhase } from "./types";

// Phase boundaries (seconds remaining on countdown)
// 10:00 → 7:00 = Arrival (3 min — segmentation questions)
// 7:00 → 4:00 = Warmup (3 min — conversation cards)
// 4:00 → 1:00 = Build (3 min — anticipation)
// 1:00 → 0:00 = Silence (1 min — hush)
// 0:00 = Curtain rise → Live

export const PHASE_THRESHOLDS = {
  arrival: 420,   // > 7:00 remaining
  warmup: 240,    // > 4:00 remaining
  build: 60,      // > 1:00 remaining
  silence: 0,     // > 0:00 remaining
} as const;

export function getPreShowPhase(timeLeft: number): PreShowPhase {
  if (timeLeft <= 0) return "curtain";
  if (timeLeft <= PHASE_THRESHOLDS.silence + 60) return "silence";  // last 60s
  if (timeLeft <= PHASE_THRESHOLDS.build + 180) return "build";     // 1:00-4:00
  if (timeLeft <= PHASE_THRESHOLDS.warmup + 180) return "warmup";   // 4:00-7:00
  return "arrival";                                                   // 7:00+
}

export const PHASE_LABELS: Record<PreShowPhase, string> = {
  arrival: "Arrival",
  warmup: "Warm-Up",
  build: "The Build",
  silence: "Silence",
  curtain: "Curtain Rise",
  live: "Live",
};

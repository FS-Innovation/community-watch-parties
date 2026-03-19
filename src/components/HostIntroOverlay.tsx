"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isVisible: boolean;
  hostName?: string;
  onComplete: () => void;
}

// Full-screen host intro before the video starts
// PRD: "Steven's live intro (2-3 min): Full-screen via LiveKit"
// This is the overlay frame — actual video would come from LiveKit in production
export default function HostIntroOverlay({ isVisible, hostName = "Steven", onComplete }: Props) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1 } }}
          className="absolute inset-0 z-[35] flex flex-col items-center justify-center"
          style={{
            background: "radial-gradient(ellipse at center, rgba(15,15,25,0.95) 0%, rgba(5,5,10,0.98) 100%)",
          }}
        >
          {/* Host video placeholder — in production this would be LiveKit */}
          <div className="w-full max-w-2xl aspect-video rounded-2xl bg-black/50 border border-white/5 overflow-hidden mb-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-3xl">🎬</span>
              </div>
              <p className="text-sm text-white/50">{hostName}&apos;s live intro</p>
              <p className="text-[10px] text-white/25 mt-1">LiveKit stream appears here</p>
            </div>
          </div>

          {/* Host name tag */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--room-gold)] font-medium">
              Live from the studio
            </p>
            <h2 className="text-xl font-bold text-white/90 mt-1">{hostName}</h2>
          </motion.div>

          {/* Skip button (for admin/testing) */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
            onClick={onComplete}
            className="absolute bottom-6 right-6 text-[10px] text-white/20 hover:text-white/50 transition-colors px-3 py-1 rounded border border-white/10"
          >
            Skip intro
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isOpen: boolean;
}

export default function CinemaCurtains({ isOpen }: Props) {
  return (
    <AnimatePresence>
      {!isOpen && (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          {/* Left curtain */}
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: 0 }}
            exit={{ x: "-100%", transition: { duration: 2, ease: [0.76, 0, 0.24, 1] } }}
            className="absolute inset-y-0 left-0 w-1/2 curtain-panel"
          >
            <div className="absolute inset-0 curtain-fabric" />
            <div className="absolute right-0 top-0 bottom-0 w-16 curtain-fold" />
          </motion.div>

          {/* Right curtain */}
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: 0 }}
            exit={{ x: "100%", transition: { duration: 2, ease: [0.76, 0, 0.24, 1] } }}
            className="absolute inset-y-0 right-0 w-1/2 curtain-panel"
          >
            <div className="absolute inset-0 curtain-fabric" />
            <div className="absolute left-0 top-0 bottom-0 w-16 curtain-fold-left" />
          </motion.div>

          {/* Center text */}
          <motion.div
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            <div className="text-center">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.8 } }}
                className="text-xs tracking-[0.3em] uppercase text-[var(--room-gold)] font-medium"
              >
                The screening is about to begin
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1.2, duration: 0.6 } }}
                className="mt-4 flex items-center justify-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--room-gold)]" style={{ animation: "pulse-dot 1.5s infinite" }} />
                <span className="text-[11px] text-[var(--room-text-muted)]">Get ready</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Top valance */}
          <motion.div
            exit={{ y: "-100%", transition: { duration: 1.8, ease: [0.76, 0, 0.24, 1] } }}
            className="absolute top-0 left-0 right-0 h-12 curtain-valance z-20"
          />
        </div>
      )}
    </AnimatePresence>
  );
}

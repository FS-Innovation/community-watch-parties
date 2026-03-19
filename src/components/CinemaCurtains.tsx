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
            exit={{ x: "-100%", transition: { duration: 2.2, ease: [0.76, 0, 0.24, 1] } }}
            className="absolute inset-y-0 left-0 w-1/2"
          >
            {/* Base panel */}
            <div className="absolute inset-0 curtain-panel" />
            {/* Fabric texture — vertical folds */}
            <div className="absolute inset-0 curtain-fabric" />
            {/* Inner shadow fold */}
            <div className="absolute right-0 top-0 bottom-0 w-20 curtain-fold" />
            {/* Highlight fold */}
            <div
              className="absolute top-0 bottom-0 w-px"
              style={{ right: "80px", background: "rgba(212,168,83,0.08)" }}
            />
            {/* Bottom drape shadow */}
            <div
              className="absolute bottom-0 left-0 right-0 h-32"
              style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.4))" }}
            />
          </motion.div>

          {/* Right curtain */}
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: 0 }}
            exit={{ x: "100%", transition: { duration: 2.2, ease: [0.76, 0, 0.24, 1] } }}
            className="absolute inset-y-0 right-0 w-1/2"
          >
            <div className="absolute inset-0 curtain-panel" />
            <div className="absolute inset-0 curtain-fabric" />
            <div className="absolute left-0 top-0 bottom-0 w-20 curtain-fold-left" />
            <div
              className="absolute top-0 bottom-0 w-px"
              style={{ left: "80px", background: "rgba(212,168,83,0.08)" }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-32"
              style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.4))" }}
            />
          </motion.div>

          {/* Center seam glow */}
          <motion.div
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            className="absolute top-12 bottom-0 left-1/2 -translate-x-1/2 w-px z-10"
            style={{
              background: "linear-gradient(180deg, rgba(212,168,83,0.15) 0%, rgba(212,168,83,0.05) 50%, transparent 100%)",
            }}
          />

          {/* Center text */}
          <motion.div
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            <div className="text-center">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.8 } }}
                className="text-[10px] tracking-[0.4em] uppercase font-medium"
                style={{ color: "rgba(212,168,83,0.6)" }}
              >
                Behind The Diary
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1, duration: 0.8 } }}
                className="text-xs tracking-[0.2em] uppercase mt-3"
                style={{ color: "rgba(212,168,83,0.35)" }}
              >
                The screening is about to begin
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1.5, duration: 0.6 } }}
                className="mt-5 flex items-center justify-center gap-2"
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: "rgba(212,168,83,0.5)", animation: "pulse-dot 1.5s infinite" }}
                />
                <span className="text-[10px]" style={{ color: "rgba(212,168,83,0.3)" }}>
                  Get ready
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Top valance with gold trim */}
          <motion.div
            exit={{ y: "-100%", transition: { duration: 1.8, ease: [0.76, 0, 0.24, 1] } }}
            className="absolute top-0 left-0 right-0 z-20"
          >
            {/* Main valance */}
            <div className="h-10 curtain-valance" />
            {/* Gold trim line */}
            <div
              className="h-px w-full"
              style={{ background: "linear-gradient(90deg, transparent 5%, rgba(212,168,83,0.3) 20%, rgba(212,168,83,0.5) 50%, rgba(212,168,83,0.3) 80%, transparent 95%)" }}
            />
            {/* Subtle swag drape */}
            <div
              className="h-3"
              style={{
                background: "linear-gradient(180deg, rgba(10,10,10,0.8) 0%, transparent 100%)",
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

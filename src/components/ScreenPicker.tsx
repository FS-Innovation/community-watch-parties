"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SCREENS, type Screen } from "@/lib/types";

interface Props {
  onSelect: (screen: Screen) => void;
}

export default function ScreenPicker({ onSelect }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="min-h-screen px-4 py-16 sm:py-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--cwp-gold)] font-medium mb-3">
            Pick Your Screen
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Where do you want to watch?
          </h2>
          <p className="text-[var(--cwp-text-secondary)] max-w-lg mx-auto">
            Each screen is a different room with a different kind of crowd.
            Pick the one that feels right.
          </p>
        </motion.div>

        {/* Showtime Board */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SCREENS.map((screen, i) => (
            <motion.button
              key={screen.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.5 }}
              className="screen-card text-left"
              style={
                {
                  "--card-accent": screen.color,
                } as React.CSSProperties
              }
              onClick={() => onSelect(screen)}
              onMouseEnter={() => setHoveredId(screen.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl flex-shrink-0 mt-0.5">
                  {screen.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] tracking-[0.2em] uppercase font-medium px-2 py-0.5 rounded"
                      style={{
                        color: screen.color,
                        background: `${screen.color}15`,
                      }}
                    >
                      Screen {i + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{screen.name}</h3>
                  <p className="text-sm text-[var(--cwp-text-secondary)]">
                    {screen.description}
                  </p>
                </div>
                <motion.div
                  animate={{
                    opacity: hoveredId === screen.id ? 1 : 0,
                    x: hoveredId === screen.id ? 0 : -5,
                  }}
                  className="text-[var(--cwp-text-muted)] flex-shrink-0 mt-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </motion.div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

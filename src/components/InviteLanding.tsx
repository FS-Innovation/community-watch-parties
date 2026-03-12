"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onContinue: () => void;
}

export default function InviteLanding({ onContinue }: Props) {
  const [videoPlayed, setVideoPlayed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-2xl mx-auto"
      >
        {/* Brand mark */}
        <p className="text-xs tracking-[0.4em] uppercase text-[var(--cwp-text-muted)] font-medium mb-8">
          A FlightStory Experience
        </p>

        {/* Invite Video Placeholder */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative aspect-video w-full max-w-xl mx-auto mb-10 rounded-xl overflow-hidden glass-panel cursor-pointer group"
          onClick={() => setVideoPlayed(true)}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-[var(--cwp-dark)]/60 to-[var(--cwp-dark)]">
            {!videoPlayed ? (
              <>
                <div className="w-16 h-16 rounded-full border-2 border-[var(--cwp-gold)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg
                    className="w-6 h-6 text-[var(--cwp-gold)] ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-sm text-[var(--cwp-text-secondary)]">
                  Watch Steven&apos;s invitation
                </p>
              </>
            ) : (
              <div className="text-center">
                <p className="text-lg text-[var(--cwp-gold)] font-medium mb-2">
                  Video player placeholder
                </p>
                <p className="text-sm text-[var(--cwp-text-muted)]">
                  Steven&apos;s 30-60s invite video goes here (Mux)
                </p>
              </div>
            )}
          </div>
          {/* Gradient overlay for cinema feel */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--cwp-dark)] via-transparent to-transparent opacity-50 pointer-events-none" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
        >
          You&apos;re Invited
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="text-lg text-[var(--cwp-text-secondary)] max-w-md mx-auto mb-3 leading-relaxed"
        >
          An exclusive first-watch of an unreleased BTD episode.
          Together, with people who care about the same things you do.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="text-sm text-[var(--cwp-text-muted)] mb-10"
        >
          1,000 people need to sign up before this happens. No threshold, no event.
        </motion.p>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          onClick={onContinue}
          className="btn-primary text-base px-10 py-4"
        >
          Step Inside
        </motion.button>
      </motion.div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import type { Registration } from "@/lib/types";

interface Props {
  registration: Registration;
  screenName: string;
  onContinue: () => void;
}

export default function CinemaTicket({ registration, screenName, onContinue }: Props) {
  const ticketNum = String(registration.ticket_number || 0).padStart(4, "0");
  const seatCode = registration.seat_code || "A-01";

  const handleShare = async () => {
    const text = `I just got my ticket (#${ticketNum}) for the BTD exclusive screening! 🎬`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url: window.location.origin });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text + " " + window.location.origin);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Success message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-6"
          >
            <p className="text-xs tracking-[0.3em] uppercase text-[var(--cwp-gold)] font-medium mb-2">
              You&apos;re registered
            </p>
            <h2 className="text-2xl font-bold">Your Cinema Ticket</h2>
          </motion.div>

          {/* The Ticket */}
          <div className="cinema-ticket p-6">
            {/* Top section */}
            <div className="text-center mb-6">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--cwp-text-muted)] mb-1">
                BTD Exclusive Screening
              </p>
              <p className="text-lg font-semibold text-[var(--cwp-gold)]">
                {screenName}
              </p>
            </div>

            {/* Ticket details grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-[10px] tracking-[0.15em] uppercase text-[var(--cwp-text-muted)] mb-1">
                  Ticket
                </p>
                <p className="text-xl font-mono font-bold text-[var(--cwp-text)]">
                  #{ticketNum}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] tracking-[0.15em] uppercase text-[var(--cwp-text-muted)] mb-1">
                  Seat
                </p>
                <p className="text-xl font-mono font-bold text-[var(--cwp-text)]">
                  {seatCode}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] tracking-[0.15em] uppercase text-[var(--cwp-text-muted)] mb-1">
                  Guest
                </p>
                <p className="text-lg font-semibold text-[var(--cwp-text)] truncate">
                  {registration.first_name}
                </p>
              </div>
            </div>

            {/* Perforation line */}
            <div className="ticket-perforation pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--cwp-text-muted)]">
                  Admit One
                </p>
                <p className="text-xs text-[var(--cwp-text-muted)]">
                  community.steven.com
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 space-y-3"
          >
            {/* Referral */}
            <div className="glass-panel-light p-4 text-center">
              <p className="text-sm text-[var(--cwp-text-secondary)] mb-2">
                Invite a friend to join your party?
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${registration.referral_code}`}
                  className="input-field text-xs flex-1"
                />
                <button onClick={handleShare} className="btn-secondary px-3 py-2 text-sm">
                  Share
                </button>
              </div>
            </div>

            <button onClick={onContinue} className="btn-primary w-full">
              Join Your Watch Party Room
            </button>

            <p className="text-xs text-[var(--cwp-text-muted)] text-center">
              We&apos;ll also email you a calendar invite and watch party link.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import type { Registration, Room } from "@/lib/types";

interface Props {
  registration: Registration;
  room: Room | null;
}

export default function RoomAssignment({ registration, room }: Props) {
  const isOpen = room && room.status === "open";
  const isFilling = room && room.status === "filling";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--cwp-gold)] font-medium mb-2">
            Your Watch Party Room
          </p>
          <h2 className="text-2xl font-bold mb-2">
            {room ? room.name : "Finding your room..."}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-8"
        >
          {isFilling && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--cwp-surface)] flex items-center justify-center">
                  <span className="text-2xl">⏳</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Filling up</h3>
                <p className="text-sm text-[var(--cwp-text-secondary)]">
                  {room.current_count}/{room.min_threshold} people interested.
                  Once we hit {room.min_threshold}, everyone gets their WhatsApp invite at the same time.
                </p>
              </div>
              <div className="threshold-bar mb-2">
                <div
                  className="threshold-fill"
                  style={{
                    width: `${Math.min(100, (room.current_count / room.min_threshold) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-[var(--cwp-text-muted)] text-center">
                We&apos;ll notify you the moment your room opens.
              </p>
            </>
          )}

          {isOpen && room.whatsapp_invite_link && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Your room is open!</h3>
                <p className="text-sm text-[var(--cwp-text-secondary)]">
                  {room.current_count} people are already in. Join the conversation before the screening starts.
                </p>
              </div>
              <a
                href={room.whatsapp_invite_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full inline-flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
                Join WhatsApp Room
              </a>
            </>
          )}

          {!room && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--cwp-surface)] flex items-center justify-center animate-pulse">
                <span className="text-2xl">🎬</span>
              </div>
              <p className="text-sm text-[var(--cwp-text-secondary)]">
                We&apos;re matching you with the perfect room. You&apos;ll get an email when it&apos;s ready.
              </p>
            </div>
          )}
        </motion.div>

        {/* Popcorn & Snacks section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 glass-panel-light p-6"
        >
          <h3 className="text-sm font-semibold text-[var(--cwp-gold)] mb-2 tracking-wide uppercase">
            🍿 Popcorn &amp; Snacks
          </h3>
          <p className="text-sm text-[var(--cwp-text-secondary)] mb-4">
            Get ready for the screening. Grab your Conversation Cards and warm up.
          </p>
          <div className="space-y-3">
            <a
              href="#"
              className="block p-3 rounded-lg bg-[var(--cwp-surface)] border border-[var(--cwp-border-subtle)] hover:border-[var(--cwp-gold)] transition-colors"
            >
              <p className="text-sm font-medium">Conversation Cards</p>
              <p className="text-xs text-[var(--cwp-text-muted)]">
                The original set by Steven Bartlett
              </p>
            </a>
            <a
              href="#"
              className="block p-3 rounded-lg bg-[var(--cwp-surface)] border border-[var(--cwp-border-subtle)] hover:border-[var(--cwp-gold)] transition-colors"
            >
              <p className="text-sm font-medium">Behind the Diary</p>
              <p className="text-xs text-[var(--cwp-text-muted)]">
                Watch past episodes to get ready
              </p>
            </a>
          </div>
        </motion.div>

        {/* Back to ticket */}
        <p className="text-center mt-6 text-xs text-[var(--cwp-text-muted)]">
          Your ticket: #{String(registration.ticket_number || 0).padStart(4, "0")} &middot; Seat {registration.seat_code || "A-01"}
        </p>
      </div>
    </div>
  );
}

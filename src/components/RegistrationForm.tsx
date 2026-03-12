"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Screen, Registration, Room } from "@/lib/types";

interface Props {
  screen: Screen;
  onComplete: (registration: Registration, room?: Room) => void;
  onBack: () => void;
}

export default function RegistrationForm({ screen, onComplete, onBack }: Props) {
  const [formStep, setFormStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [attention, setAttention] = useState("");
  const [worthTime, setWorthTime] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          email,
          city,
          screen_choice: screen.id,
          attention,
          worth_time: worthTime,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      onComplete(data.registration, data.room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  const steps = [
    // Step 0: Identity
    <motion.div
      key="identity"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <p className="text-sm text-[var(--cwp-text-muted)] mb-6">
        Quick — just so we know who to save a seat for.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--cwp-text-secondary)] mb-1.5">
            First name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="input-field"
            placeholder="Your first name"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--cwp-text-secondary)] mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--cwp-text-secondary)] mb-1.5">
            City
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="input-field"
            placeholder="Where are you watching from?"
          />
        </div>
      </div>
      <button
        onClick={() => setFormStep(1)}
        disabled={!firstName.trim() || !email.trim()}
        className="btn-primary w-full mt-6"
      >
        Continue
      </button>
    </motion.div>,

    // Step 1: What caught your attention
    <motion.div
      key="attention"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <p className="text-sm text-[var(--cwp-text-muted)] mb-6">
        Two quick questions — helps us make the experience better.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--cwp-text-secondary)] mb-1.5">
            What caught your attention about this?
          </label>
          <textarea
            value={attention}
            onChange={(e) => setAttention(e.target.value)}
            className="input-field resize-none"
            rows={3}
            placeholder="Be honest — what made you click?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--cwp-text-secondary)] mb-1.5">
            What would make this worth your time tonight?
          </label>
          <textarea
            value={worthTime}
            onChange={(e) => setWorthTime(e.target.value)}
            className="input-field resize-none"
            rows={3}
            placeholder="What are you hoping to get out of it?"
          />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={() => setFormStep(0)} className="btn-secondary flex-1">
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary flex-1"
        >
          {submitting ? "Securing your seat..." : "Claim My Seat"}
        </button>
      </div>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Screen badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <button
            onClick={onBack}
            className="text-sm text-[var(--cwp-text-muted)] hover:text-[var(--cwp-text)] transition-colors mb-4 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Change screen
          </button>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
            style={{
              color: screen.color,
              background: `${screen.color}12`,
              border: `1px solid ${screen.color}30`,
            }}
          >
            <span>{screen.icon}</span>
            <span>{screen.name}</span>
          </div>
        </motion.div>

        {/* Form panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-8"
        >
          <h2 className="text-xl font-semibold mb-1">Book your seat</h2>
          <div className="flex items-center gap-2 mb-6">
            <div className="flex gap-1">
              {[0, 1].map((s) => (
                <div
                  key={s}
                  className="h-1 w-8 rounded-full transition-colors"
                  style={{
                    background:
                      s <= formStep
                        ? "var(--cwp-gold)"
                        : "var(--cwp-border-subtle)",
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-[var(--cwp-text-muted)]">
              {formStep + 1}/2
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {steps[formStep]}
        </motion.div>

        <p className="text-xs text-center text-[var(--cwp-text-muted)] mt-4 px-4">
          By registering you agree to our privacy policy. Your data is used to deliver the screening experience and match you with relevant connections.
        </p>
      </div>
    </div>
  );
}

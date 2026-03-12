"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";

interface MatchRecommendation {
  id: string;
  first_name: string;
  match_reason: string;
  status: string;
}

export default function PostWatchPage() {
  const params = useParams();
  const token = params.token as string;

  const [reflection, setReflection] = useState("");
  const [reflectionSubmitted, setReflectionSubmitted] = useState(false);
  const [matches, setMatches] = useState<MatchRecommendation[]>([]);
  const [contactMethod, setContactMethod] = useState<"linkedin" | "whatsapp">("linkedin");

  const loadMatches = useCallback(async () => {
    try {
      const res = await fetch(`/api/matchmaking/recommendations?token=${token}`);
      const data = await res.json();
      setMatches(data.matches || []);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const submitReflection = async () => {
    if (!reflection.trim()) return;
    await fetch("/api/screening/reflection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, reflection }),
    }).catch(() => {});
    setReflectionSubmitted(true);
  };

  const acceptMatch = async (matchId: string) => {
    await fetch("/api/matchmaking/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, match_id: matchId, contact_method: contactMethod }),
    }).catch(() => {});
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: "accepted" } : m))
    );
  };

  return (
    <main className="min-h-screen px-4 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--cwp-gold)] font-medium mb-3">
            Screening Complete
          </p>
          <h1 className="text-3xl font-bold mb-2">That was something.</h1>
          <p className="text-[var(--cwp-text-secondary)]">
            Thanks for being in the room. Here&apos;s what comes next.
          </p>
        </motion.div>

        {/* Reflection Prompt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 mb-8"
        >
          <h2 className="text-lg font-semibold mb-2">One last thing</h2>
          <p className="text-sm text-[var(--cwp-text-secondary)] mb-4">
            What moment hit you the hardest?
          </p>
          {!reflectionSubmitted ? (
            <div className="flex gap-2">
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="input-field flex-1 resize-none"
                rows={3}
                placeholder="The moment that stuck with me was..."
              />
              <button onClick={submitReflection} className="btn-primary self-end">
                Share
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              Thanks for sharing. Your reflection helps us make the next screening even better.
            </div>
          )}
        </motion.div>

        {/* Match Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel p-6 mb-8"
        >
          <h2 className="text-lg font-semibold mb-1">People from your room</h2>
          <p className="text-sm text-[var(--cwp-text-secondary)] mb-4">
            These people were in the room with you and seem to care about similar things.
            Want to connect?
          </p>

          {/* Contact method preference */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setContactMethod("linkedin")}
              className={`btn-secondary text-sm ${contactMethod === "linkedin" ? "border-[var(--cwp-gold)] text-[var(--cwp-gold)]" : ""}`}
            >
              Share via LinkedIn
            </button>
            <button
              onClick={() => setContactMethod("whatsapp")}
              className={`btn-secondary text-sm ${contactMethod === "whatsapp" ? "border-[var(--cwp-gold)] text-[var(--cwp-gold)]" : ""}`}
            >
              Share via WhatsApp
            </button>
          </div>

          {matches.length === 0 ? (
            <p className="text-sm text-[var(--cwp-text-muted)]">
              Match recommendations are being generated. Check back soon!
            </p>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.id} className="glass-panel-light p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--cwp-surface)] flex items-center justify-center text-lg flex-shrink-0">
                    {match.first_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{match.first_name}</p>
                    <p className="text-xs text-[var(--cwp-text-secondary)] mt-0.5">
                      {match.match_reason}
                    </p>
                  </div>
                  {match.status === "accepted" ? (
                    <span className="text-xs text-green-400">Connected</span>
                  ) : (
                    <button
                      onClick={() => acceptMatch(match.id)}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      Connect
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Next steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-panel-light p-6 text-center"
        >
          <h3 className="font-semibold mb-2">What&apos;s next?</h3>
          <p className="text-sm text-[var(--cwp-text-secondary)] mb-4">
            Head back to your WhatsApp room to discuss the episode and vote on what to watch next.
          </p>
          <p className="text-xs text-[var(--cwp-text-muted)]">
            You&apos;ll get a recap email with your engagement stats, top moments, and next screening details.
          </p>
        </motion.div>
      </div>
    </main>
  );
}

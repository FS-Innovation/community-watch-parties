"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getViewerName, setViewerName } from "@/lib/viewer";
import gsap from "gsap";
import ScreeningCards from "@/components/ScreeningCards";

// 3 quick questions — just enough to find their crew, not enough to feel like a survey
const SEGMENTATION_QUESTIONS = [
  {
    id: "motivation",
    question: "What brings you here tonight?",
    placeholder: "I'm curious about...",
    label: "quick intro",
    signal: "motivation + intent",
  },
  {
    id: "segment",
    question: "Where do you want to sit?",
    subtitle: "We'll put you in a room with people who vibe the same way.",
    type: "multi-select" as const,
    options: [
      { label: "Reflection", emoji: "🪞", description: "Thinkers who go deep" },
      { label: "Building", emoji: "🔨", description: "Makers building something new" },
      { label: "Creativity", emoji: "🎨", description: "Creatives exploring ideas" },
      { label: "Connection", emoji: "🤝", description: "People-people who bring the energy" },
    ],
    label: "find your crew",
    signal: "community segment",
  },
  {
    id: "future_screenings",
    question: "What would you love to see more of?",
    subtitle: "This helps us build screenings you actually want to show up to.",
    type: "multi-select" as const,
    options: [
      { label: "Founder stories", emoji: "🚀", description: "Startup journeys & lessons" },
      { label: "Creative deep-dives", emoji: "🎬", description: "Art, film, music, design" },
      { label: "Mental health & growth", emoji: "🌱", description: "Wellbeing & self-development" },
      { label: "Live conversations", emoji: "🎙️", description: "Real-time Q&A with guests" },
    ],
    label: "shape future screenings",
    signal: "content preference",
  },
];

const SEGMENT_MESSAGES: Record<string, string> = {
  Reflection: "You're headed to the Reflection room — you'll be watching with others who like to go deep and sit with the big questions.",
  Building: "You're headed to the Building room — you'll be alongside other makers and builders who are creating something new.",
  Creativity: "You're headed to the Creativity room — you'll be with fellow creatives who are drawn to ideas and inspiration.",
  Connection: "You're headed to the Connection room — you'll be with people who bring the energy and love meeting new people.",
};

interface Props {
  eventId: string;
  viewerId: string;
  countdownStart: number | null;
  countdownDuration: number;
  onComplete: () => void;
  onCardChange?: (prompt: string, author: string) => void;
}

interface SegmentResponse {
  questionId: string;
  answer: string | string[];
}

export default function CommunitySegmentFlow({ eventId, viewerId, countdownStart, countdownDuration, onComplete, onCardChange }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [responses, setResponses] = useState<SegmentResponse[]>([]);
  const [globalTimeLeft, setGlobalTimeLeft] = useState(countdownDuration);
  const [phase, setPhase] = useState<"name" | "questions" | "ready" | "picking" | "cards">("name");
  const [assignedSegment, setAssignedSegment] = useState<string | null>(null);
  const [placementMessage, setPlacementMessage] = useState<string | null>(null);
  const [presenceCount, setPresenceCount] = useState(0);
  const stepRef = useRef<HTMLDivElement>(null);

  // Load saved name
  useEffect(() => {
    const saved = getViewerName();
    if (saved) setDisplayName(saved);
  }, []);

  // Fetch live presence count for social proof
  useEffect(() => {
    const fetchPresence = async () => {
      try {
        const res = await fetch(`/api/presence?event_id=${eventId}`);
        const data = await res.json();
        if (data.count) setPresenceCount(data.count);
      } catch { /* ignore */ }
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 15000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Global countdown synced with server
  useEffect(() => {
    if (!countdownStart) return;
    const tick = () => {
      const elapsed = (Date.now() - countdownStart) / 1000;
      const remaining = Math.max(0, countdownDuration - elapsed);
      setGlobalTimeLeft(Math.ceil(remaining));
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [countdownStart, countdownDuration]);

  // GSAP entrance for each step
  useEffect(() => {
    if (phase !== "questions" || !stepRef.current) return;
    const el = stepRef.current;
    gsap.fromTo(el, {
      opacity: 0,
      y: 30,
      scale: 0.97,
    }, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.5,
      ease: "power3.out",
    });
  }, [phase, currentStep]);

  const confirmName = () => {
    if (!displayName.trim()) return;
    setViewerName(displayName.trim());
    setPhase("questions");
  };

  const submitTextAnswer = () => {
    if (!textAnswer.trim()) return;
    const q = SEGMENTATION_QUESTIONS[currentStep];
    const newResponses = [...responses, { questionId: q.id, answer: textAnswer.trim() }];
    setResponses(newResponses);
    setTextAnswer("");

    // Send to server
    fetch("/api/icebreaker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        viewer_id: viewerId,
        display_name: displayName,
        prompt: q.question,
        answer: textAnswer.trim(),
        signal_type: q.signal,
      }),
    }).catch(() => {});

    advanceStep(newResponses);
  };

  const submitOptionAnswer = () => {
    if (selectedOptions.length === 0) return;
    const q = SEGMENTATION_QUESTIONS[currentStep];
    const newResponses = [...responses, { questionId: q.id, answer: selectedOptions }];
    setResponses(newResponses);

    fetch("/api/icebreaker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        viewer_id: viewerId,
        display_name: displayName,
        prompt: q.question,
        answer: selectedOptions.join(", "),
        signal_type: q.signal,
      }),
    }).catch(() => {});

    setSelectedOptions([]);
    advanceStep(newResponses);
  };

  const advanceStep = (allResponses: SegmentResponse[]) => {
    if (currentStep < SEGMENTATION_QUESTIONS.length - 1) {
      // Animate out, then advance
      if (stepRef.current) {
        gsap.to(stepRef.current, {
          opacity: 0,
          y: -20,
          duration: 0.25,
          ease: "power2.in",
          onComplete: () => setCurrentStep((i) => i + 1),
        });
      } else {
        setCurrentStep((i) => i + 1);
      }
    } else {
      // All done — derive segment from the user's explicit vibe pick
      const segmentResponse = allResponses.find(r => r.questionId === "segment");
      const picked = Array.isArray(segmentResponse?.answer)
        ? segmentResponse.answer[0]
        : segmentResponse?.answer?.split(",")[0]?.trim();
      const segment = picked || "Connection";
      setAssignedSegment(segment);
      setPlacementMessage(SEGMENT_MESSAGES[segment] || `You're headed to the ${segment} room — ready?`);
      setPhase("ready");
    }
  };

  const toggleOption = (label: string) => {
    setSelectedOptions(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentQuestion = SEGMENTATION_QUESTIONS[currentStep];

  // ─── Conversation cards phase ───
  if (phase === "cards") {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col h-full px-4">
        {/* Countdown pill + segment badge */}
        <div className="flex flex-col items-center gap-2 py-4 flex-shrink-0">
          {countdownStart && globalTimeLeft > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--room-surface)] border border-[var(--room-border)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--room-gold)]" style={{ animation: "pulse-dot 1.5s infinite" }} />
              <span className="text-sm font-mono font-medium text-[var(--room-text)]">{formatTime(globalTimeLeft)}</span>
              <span className="text-[10px] text-[var(--room-text-muted)] tracking-wider uppercase">until screening</span>
            </div>
          )}
          {assignedSegment && (
            <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--room-text-muted)]">
              {assignedSegment === "Reflection" && "🪞"}
              {assignedSegment === "Building" && "🔨"}
              {assignedSegment === "Creativity" && "🎨"}
              {assignedSegment === "Connection" && "🤝"}
              {" "}{assignedSegment} Crew
            </span>
          )}
        </div>
        {/* Cards */}
        <div className="flex-1 min-h-0">
          <ScreeningCards
            eventId={eventId}
            viewerId={viewerId}
            segment={assignedSegment || undefined}
            onAllDone={onComplete}
            onCardChange={onCardChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center px-4">
      {/* Countdown pill */}
      {countdownStart && (
        <div className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--room-surface)] border border-[var(--room-border)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--room-gold)]" style={{ animation: "pulse-dot 1.5s infinite" }} />
          <span className="text-sm font-mono font-medium text-[var(--room-text)]">{formatTime(globalTimeLeft)}</span>
          <span className="text-[10px] text-[var(--room-text-muted)] tracking-wider uppercase">until screening</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ─── Name Entry ─── */}
        {phase === "name" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center w-full max-w-md"
          >
            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--room-gold)] font-medium mb-6">
              Community Screening
            </p>
            <h1 className="text-2xl font-bold mb-2">Find Your People</h1>
            <p className="text-sm text-[var(--room-text-secondary)] mb-2">
              3 quick questions and we&apos;ll find your crew. You&apos;ll watch together, chat together, and actually connect.
            </p>
            {presenceCount > 1 && (
              <p className="text-xs text-[var(--room-text-muted)] mb-8">
                {presenceCount} {presenceCount === 1 ? "person" : "others"} here right now
              </p>
            )}
            {presenceCount <= 1 && <div className="mb-8" />}
            <div className="space-y-3">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmName()}
                className="room-input text-center text-lg"
                placeholder="What should we call you?"
                autoFocus
              />
              <button
                onClick={confirmName}
                disabled={!displayName.trim()}
                className="btn-accent w-full text-sm py-3"
              >
                Find my crew
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Segmentation Questions (chatbot-style) ─── */}
        {phase === "questions" && (
          <motion.div
            key="questions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-lg"
          >
            {/* Progress dots */}
            <div className="flex gap-2 justify-center mb-8">
              {SEGMENTATION_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < currentStep
                      ? "w-8 bg-[var(--room-accent)]"
                      : i === currentStep
                      ? "w-8 bg-[var(--room-gold)]"
                      : "w-4 bg-[var(--room-surface)]"
                  }`}
                />
              ))}
            </div>

            <div ref={stepRef}>
              {/* Question label */}
              <p className="text-[9px] tracking-[0.2em] uppercase text-[var(--room-text-muted)] mb-3">
                {currentQuestion.label || currentQuestion.signal}
              </p>

              {/* Question text */}
              <h2 className="text-lg font-medium mb-2 leading-relaxed">
                {currentQuestion.question}
              </h2>
              {/* Subtitle explaining why we're asking */}
              {"subtitle" in currentQuestion && currentQuestion.subtitle && (
                <p className="text-xs text-[var(--room-text-muted)] mb-6">
                  {currentQuestion.subtitle}
                </p>
              )}
              {!("subtitle" in currentQuestion && currentQuestion.subtitle) && <div className="mb-4" />}

              {/* Text input questions — no skip */}
              {!currentQuestion.type && (
                <div className="space-y-3">
                  <input
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitTextAnswer()}
                    className="room-input text-sm"
                    placeholder={currentQuestion.placeholder}
                    autoFocus
                  />
                  <button
                    onClick={submitTextAnswer}
                    disabled={!textAnswer.trim()}
                    className="btn-accent w-full text-sm py-3"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Multi-select questions */}
              {currentQuestion.type && currentQuestion.options && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {currentQuestion.options.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => toggleOption(opt.label)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          selectedOptions.includes(opt.label)
                            ? "border-[var(--room-accent)] bg-[var(--room-surface-hover)] scale-[1.02]"
                            : "border-[var(--room-border)] bg-[var(--room-surface)] hover:border-[var(--room-border-active)]"
                        }`}
                      >
                        <span className="text-2xl mb-2 block">{opt.emoji}</span>
                        <span className="text-sm font-medium block">{opt.label}</span>
                        <span className="text-[10px] text-[var(--room-text-muted)] block mt-0.5">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                  {currentQuestion.type === "multi-select" && (
                    <p className="text-[10px] text-[var(--room-text-muted)] text-center">
                      Choose as many as you like
                    </p>
                  )}
                  <button
                    onClick={submitOptionAnswer}
                    disabled={selectedOptions.length === 0}
                    className="btn-accent w-full text-sm py-3"
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Ready: Segment placement ─── */}
        {phase === "ready" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg"
          >
            {/* Segment badge */}
            {assignedSegment && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-6"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--room-surface)] border border-[var(--room-border)] flex items-center justify-center text-2xl">
                  {assignedSegment === "Reflection" && "🪞"}
                  {assignedSegment === "Building" && "🔨"}
                  {assignedSegment === "Creativity" && "🎨"}
                  {assignedSegment === "Connection" && "🤝"}
                </div>
                <div>
                  <p className="text-[9px] tracking-[0.2em] uppercase text-[var(--room-text-muted)]">
                    Your crew
                  </p>
                  <p className="text-lg font-semibold text-[var(--room-text)]">
                    {assignedSegment}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Placement message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-2xl bg-[var(--room-surface)] border border-[var(--room-border)] mb-6"
            >
              <p className="text-sm leading-relaxed text-[var(--room-text)]">
                {placementMessage || (assignedSegment
                  ? `You're headed to the ${assignedSegment} room — you'll be watching and chatting with people who think like you. Ready?`
                  : "We found your crew for tonight's screening. You'll be watching together and chatting in real time. Ready?"
                )}
              </p>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <button
                onClick={() => setPhase("cards")}
                className="btn-accent w-full text-sm py-3"
              >
                Take me in
              </button>
              <button
                onClick={() => setPhase("picking")}
                className="btn-ghost w-full text-sm py-3"
              >
                Switch rooms
              </button>
              {globalTimeLeft > 0 && (
                <p className="text-[11px] text-[var(--room-text-muted)] text-center">
                  Screening starts in {formatTime(globalTimeLeft)}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ─── Picking: Choose a different segment ─── */}
        {phase === "picking" && (
          <motion.div
            key="picking"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-lg"
          >
            <p className="text-[9px] tracking-[0.2em] uppercase text-[var(--room-text-muted)] mb-3">
              Pick your crew
            </p>
            <h2 className="text-lg font-medium mb-6 leading-relaxed">
              No worries — which crew feels more like you?
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Reflection", emoji: "🪞", description: "Meaning-seekers who go deep" },
                { label: "Building", emoji: "🔨", description: "Builders creating something new" },
                { label: "Creativity", emoji: "🎨", description: "Creatives exploring ideas" },
                { label: "Connection", emoji: "🤝", description: "Connectors who bring people together" },
              ].map((seg) => (
                <button
                  key={seg.label}
                  onClick={() => {
                    setAssignedSegment(seg.label);
                    setPlacementMessage(`Switching you to the ${seg.label} crew — you'll be watching with them tonight.`);
                    setPhase("ready");
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    assignedSegment === seg.label
                      ? "border-[var(--room-accent)] bg-[var(--room-surface-hover)]"
                      : "border-[var(--room-border)] bg-[var(--room-surface)] hover:border-[var(--room-border-active)]"
                  }`}
                >
                  <span className="text-2xl mb-2 block">{seg.emoji}</span>
                  <span className="text-sm font-medium block">{seg.label}</span>
                  <span className="text-[10px] text-[var(--room-text-muted)] block mt-0.5">{seg.description}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPhase("ready")}
              className="btn-ghost w-full text-sm py-2"
            >
              Actually, take me back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

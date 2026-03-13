"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getViewerName, setViewerName } from "@/lib/viewer";
import gsap from "gsap";

// Community segmentation questions — chatbot-style flow
// These gather motivation, intent, segment, and routing preferences
const SEGMENTATION_QUESTIONS = [
  {
    id: "motivation",
    question: "What made you want to join the community screening tonight?",
    placeholder: "I'm here because...",
    signal: "motivation + intent",
  },
  {
    id: "desired_outcome",
    question: "What would make this worth your time tonight?",
    placeholder: "I'd love it if...",
    signal: "desired outcome",
  },
  {
    id: "segment",
    question: "Which kind of room feels most like you right now?",
    type: "multi-select" as const,
    options: [
      { label: "Reflection", emoji: "🪞", description: "Meaning-seekers who go deep" },
      { label: "Building", emoji: "🔨", description: "Builders creating something new" },
      { label: "Creativity", emoji: "🎨", description: "Creatives exploring ideas" },
      { label: "Connection", emoji: "🤝", description: "Connectors who bring people together" },
    ],
    signal: "community segment",
  },
  {
    id: "future_screenings",
    question: "What types of screenings would you love more of in the future?",
    type: "multi-select" as const,
    options: [
      { label: "Founder stories", emoji: "🚀", description: "Startup journeys & lessons" },
      { label: "Creative deep-dives", emoji: "🎬", description: "Art, film, music, design" },
      { label: "Mental health & growth", emoji: "🌱", description: "Wellbeing & self-development" },
      { label: "Live conversations", emoji: "🎙️", description: "Real-time Q&A with guests" },
    ],
    signal: "content preference",
  },
];

interface Props {
  eventId: string;
  viewerId: string;
  countdownStart: number | null;
  countdownDuration: number;
  onComplete: () => void;
}

interface SegmentResponse {
  questionId: string;
  answer: string | string[];
}

export default function IcebreakerFlow({ eventId, viewerId, countdownStart, countdownDuration, onComplete }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [responses, setResponses] = useState<SegmentResponse[]>([]);
  const [globalTimeLeft, setGlobalTimeLeft] = useState(countdownDuration);
  const [phase, setPhase] = useState<"name" | "questions" | "processing" | "ready" | "picking">("name");
  const [assignedSegment, setAssignedSegment] = useState<string | null>(null);
  const [placementMessage, setPlacementMessage] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<{ name: string; reason: string } | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  // Load saved name
  useEffect(() => {
    const saved = getViewerName();
    if (saved) setDisplayName(saved);
  }, []);

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
      // All done — process and send to AI matchmaking
      setPhase("processing");
      processSegmentation(allResponses);
    }
  };

  const processSegmentation = async (allResponses: SegmentResponse[]) => {
    try {
      const res = await fetch("/api/matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          viewer_id: viewerId,
          display_name: displayName,
          responses: allResponses.map(r => ({
            prompt: SEGMENTATION_QUESTIONS.find(q => q.id === r.questionId)?.question || "",
            answer: Array.isArray(r.answer) ? r.answer.join(", ") : r.answer,
          })),
        }),
      });
      const data = await res.json();
      if (data.segment) setAssignedSegment(data.segment);
      if (data.placement_message) setPlacementMessage(data.placement_message);
      if (data.match) setMatchResult({ name: data.match.name, reason: data.match.reason });
    } catch { /* continue anyway */ }

    setPhase("ready");
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
              FlightStory Screenings
            </p>
            <h1 className="text-2xl font-bold mb-2">Welcome to the Screening</h1>
            <p className="text-sm text-[var(--room-text-secondary)] mb-8">
              Before the show, we&apos;ll match you with the right interest group so you can connect with people who get you.
            </p>
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
                Let&apos;s go
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
                {currentQuestion.signal}
              </p>

              {/* Question text */}
              <h2 className="text-lg font-medium mb-6 leading-relaxed">
                {currentQuestion.question}
              </h2>

              {/* Text input questions */}
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
                  <div className="flex gap-2">
                    <button
                      onClick={submitTextAnswer}
                      disabled={!textAnswer.trim()}
                      className="btn-accent flex-1 text-sm"
                    >
                      Continue
                    </button>
                    <button
                      onClick={() => advanceStep([...responses, { questionId: currentQuestion.id, answer: "(skipped)" }])}
                      className="btn-ghost text-sm px-4"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {/* Multi/single select questions */}
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

        {/* ─── Processing ─── */}
        {phase === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center max-w-md"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-[var(--room-accent)] border-t-transparent"
            />
            <p className="text-lg font-medium mb-2">Finding your interest group</p>
            <p className="text-sm text-[var(--room-text-secondary)]">
              Matching you with people who share your vibe...
            </p>
          </motion.div>
        )}

        {/* ─── Ready: Conversational AI placement ─── */}
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
                    Your room
                  </p>
                  <p className="text-lg font-semibold text-[var(--room-text)]">
                    {assignedSegment}
                  </p>
                </div>
              </motion.div>
            )}

            {/* AI conversational message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-2xl bg-[var(--room-surface)] border border-[var(--room-border)] mb-6"
            >
              <p className="text-sm leading-relaxed text-[var(--room-text)]">
                {placementMessage || (assignedSegment
                  ? `Based on what you shared, we're taking you to the ${assignedSegment} room with others who share your energy. How does this sound?`
                  : "We've found you a great spot for tonight's screening. How does this sound?"
                )}
              </p>
              {matchResult && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xs text-[var(--room-text-secondary)] mt-3 pt-3 border-t border-[var(--room-border)] leading-relaxed"
                >
                  We also matched you with <span className="font-medium text-[var(--room-text)]">{matchResult.name}</span> — {matchResult.reason}
                </motion.p>
              )}
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <button
                onClick={onComplete}
                className="btn-accent w-full text-sm py-3"
              >
                Let&apos;s do it
              </button>
              <button
                onClick={() => setPhase("picking")}
                className="btn-ghost w-full text-sm py-3"
              >
                I&apos;d prefer a different room
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
              Pick your room
            </p>
            <h2 className="text-lg font-medium mb-6 leading-relaxed">
              No worries — which room feels more like you?
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
                    setPlacementMessage(`You got it — switching you to the ${seg.label} room. See you in there!`);
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

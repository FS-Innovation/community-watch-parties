"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getViewerName, setViewerName } from "@/lib/viewer";
import gsap from "gsap";

// DOAC Conversation Cards deck
// Place card images at public/cards/ with the filenames below
const ICEBREAKER_CARDS = [
  { prompt: "When was the last time a day flew by and what were you doing?", author: "Payal Kadakia", image: "/cards/card-1-payal-kadakia.jpg" },
  { prompt: "What did you learn from your greatest failure?", author: "Sir Richard Branson", image: "/cards/card-2-richard-branson.jpg" },
  { prompt: "What are you clear about now that one year ago you didn't know?", author: "Chris Voss", image: "/cards/card-3-chris-voss.jpg" },
  { prompt: "When was the last time you changed your mind about something life-changing?", author: "Africa Brooke", image: "/cards/card-4-africa-brooke.jpg" },
  { prompt: "Do you think your younger self would be proud / look up to you now?", author: "Lewis Capaldi", image: "/cards/card-5-lewis-capaldi.jpg" },
];

const CARD_DURATION = 50; // seconds per card (5 cards in ~4 min, leaving ~1 min for matching)

interface IcebreakerResponse {
  prompt: string;
  answer: string;
}

interface Props {
  eventId: string;
  viewerId: string;
  countdownStart: number | null;
  countdownDuration: number;
  onComplete: () => void;
}

export default function IcebreakerFlow({ eventId, viewerId, countdownStart, countdownDuration, onComplete }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [responses, setResponses] = useState<IcebreakerResponse[]>([]);
  const [cardTimeLeft, setCardTimeLeft] = useState(CARD_DURATION);
  const [globalTimeLeft, setGlobalTimeLeft] = useState(countdownDuration);
  const [matchLoading, setMatchLoading] = useState(false);
  const [match, setMatch] = useState<{ name: string; answers: string[]; reason: string } | null>(null);
  const [phase, setPhase] = useState<"name" | "cards" | "matching" | "reveal">("name");
  const cardTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const globalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const responsesRef = useRef<IcebreakerResponse[]>([]);
  const cardIndexRef = useRef(0);
  const answerRef = useRef("");

  // GSAP refs
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevCardIndex = useRef(-1);

  // Keep refs in sync
  useEffect(() => { responsesRef.current = responses; }, [responses]);
  useEffect(() => { cardIndexRef.current = currentCardIndex; }, [currentCardIndex]);
  useEffect(() => { answerRef.current = answer; }, [answer]);

  // Load saved name
  useEffect(() => {
    const saved = getViewerName();
    if (saved) setDisplayName(saved);
  }, []);

  // ─── GSAP card entrance animation ───
  useEffect(() => {
    if (phase !== "cards" || !cardRef.current) return;

    const direction = prevCardIndex.current < currentCardIndex ? 1 : -1;
    prevCardIndex.current = currentCardIndex;

    const el = cardRef.current;
    const tl = gsap.timeline();

    tl.fromTo(el, {
      opacity: 0,
      x: direction * 120,
      rotateY: direction * 15,
      scale: 0.92,
      transformPerspective: 1200,
    }, {
      opacity: 1,
      x: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.7,
      ease: "power3.out",
    });

    // Stagger the inner elements for parallax feel
    const image = el.querySelector(".card-image");
    const prompt = el.querySelector(".card-prompt-text");
    const inputArea = el.querySelector(".card-input-area");

    if (image) {
      tl.fromTo(image, {
        y: 20,
        opacity: 0,
        scale: 1.05,
      }, {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "power2.out",
      }, "-=0.5");
    }

    if (prompt) {
      tl.fromTo(prompt, {
        y: 15,
        opacity: 0,
      }, {
        y: 0,
        opacity: 1,
        duration: 0.4,
        ease: "power2.out",
      }, "-=0.35");
    }

    if (inputArea) {
      tl.fromTo(inputArea, {
        y: 10,
        opacity: 0,
      }, {
        y: 0,
        opacity: 1,
        duration: 0.35,
        ease: "power2.out",
      }, "-=0.25");
    }

    return () => { tl.kill(); };
  }, [phase, currentCardIndex]);

  // ─── 3D tilt on mouse move ───
  useEffect(() => {
    if (phase !== "cards" || !cardRef.current) return;

    const el = cardRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      gsap.to(el, {
        rotateY: x * 8,
        rotateX: -y * 5,
        transformPerspective: 1200,
        duration: 0.4,
        ease: "power2.out",
      });

      // Parallax inner image shift
      const image = el.querySelector(".card-image") as HTMLElement;
      if (image) {
        gsap.to(image, {
          x: x * -12,
          y: y * -8,
          duration: 0.4,
          ease: "power2.out",
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.6,
        ease: "power3.out",
      });
      const image = el.querySelector(".card-image") as HTMLElement;
      if (image) {
        gsap.to(image, { x: 0, y: 0, duration: 0.6, ease: "power3.out" });
      }
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [phase, currentCardIndex]);

  // Global countdown synced with server countdown
  useEffect(() => {
    if (!countdownStart) return;

    const tick = () => {
      const elapsed = (Date.now() - countdownStart) / 1000;
      const remaining = Math.max(0, countdownDuration - elapsed);
      setGlobalTimeLeft(Math.ceil(remaining));

      if (remaining <= 0 && phase === "cards") {
        if (cardTimerRef.current) clearInterval(cardTimerRef.current);
        setPhase("matching");
        findMatchFromRefs();
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownStart, countdownDuration, phase]);

  // Per-card countdown timer
  useEffect(() => {
    if (phase !== "cards") return;

    setCardTimeLeft(CARD_DURATION);
    cardTimerRef.current = setInterval(() => {
      setCardTimeLeft((t) => {
        if (t <= 1) {
          if (cardTimerRef.current) clearInterval(cardTimerRef.current);
          setTimeout(() => advanceCard(), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (cardTimerRef.current) clearInterval(cardTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentCardIndex]);

  const confirmName = () => {
    if (!displayName.trim()) return;
    setViewerName(displayName.trim());
    setNameConfirmed(true);
    setPhase("cards");
  };

  const findMatchFromRefs = () => {
    const allResponses = responsesRef.current;
    findMatch(allResponses.length > 0 ? allResponses : [{ prompt: ICEBREAKER_CARDS[0].prompt, answer: "(no responses)" }]);
  };

  const submitAnswer = useCallback(() => {
    if (!answer.trim()) return;
    const card = ICEBREAKER_CARDS[currentCardIndex];
    const newResponses = [...responses, { prompt: card.prompt, answer: answer.trim() }];
    setResponses(newResponses);
    setAnswer("");

    // GSAP exit animation before advancing
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        opacity: 0,
        x: -80,
        rotateY: -10,
        scale: 0.95,
        transformPerspective: 1200,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => {
          // Send to server
          fetch("/api/icebreaker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_id: eventId,
              viewer_id: viewerId,
              display_name: displayName,
              prompt: card.prompt,
              answer: answer.trim(),
            }),
          }).catch(() => {});

          advanceCardWithResponses(newResponses);
        },
      });
    } else {
      fetch("/api/icebreaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          viewer_id: viewerId,
          display_name: displayName,
          prompt: card.prompt,
          answer: answer.trim(),
        }),
      }).catch(() => {});
      advanceCardWithResponses(newResponses);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, currentCardIndex, responses, eventId, viewerId, displayName]);

  const advanceCard = () => {
    const currentAnswer = answerRef.current;
    const card = ICEBREAKER_CARDS[cardIndexRef.current];
    let newResponses = responsesRef.current;

    if (currentAnswer.trim()) {
      newResponses = [...newResponses, { prompt: card.prompt, answer: currentAnswer.trim() }];
      setResponses(newResponses);

      fetch("/api/icebreaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          viewer_id: viewerId,
          display_name: displayName,
          prompt: card.prompt,
          answer: currentAnswer.trim(),
        }),
      }).catch(() => {});
    }

    setAnswer("");
    advanceCardWithResponses(newResponses);
  };

  const advanceCardWithResponses = (currentResponses: IcebreakerResponse[]) => {
    if (currentCardIndex < ICEBREAKER_CARDS.length - 1) {
      setCurrentCardIndex((i) => i + 1);
    } else {
      // All cards done
      if (cardTimerRef.current) clearInterval(cardTimerRef.current);
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
      setPhase("matching");
      findMatch(currentResponses);
    }
  };

  const findMatch = async (allResponses: IcebreakerResponse[]) => {
    setMatchLoading(true);
    try {
      const res = await fetch("/api/matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          viewer_id: viewerId,
          display_name: displayName,
          responses: allResponses,
        }),
      });
      const data = await res.json();
      if (data.match) {
        setMatch(data.match);
        setPhase("reveal");
      } else {
        onComplete();
      }
    } catch {
      onComplete();
    } finally {
      setMatchLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const card = ICEBREAKER_CARDS[currentCardIndex];
  const progress = ((currentCardIndex) / ICEBREAKER_CARDS.length) * 100;
  const cardProgress = ((CARD_DURATION - cardTimeLeft) / CARD_DURATION) * 100;

  // Lights dimming effect synced with countdown progress
  const countdownProgress = countdownStart ? Math.min(1, (Date.now() - countdownStart) / (countdownDuration * 1000)) : 0;
  const bgDarkness = Math.min(0.85, countdownProgress * 0.85);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center" style={{ perspective: "1200px" }}>
      <AnimatePresence mode="wait">
        {/* ─── Name Entry ─── */}
        {phase === "name" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-md mx-4"
          >
            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--room-gold)] font-medium mb-6">
              The Diary of a CEO
            </p>
            <h1 className="text-2xl font-bold mb-2">Welcome to the Screening</h1>
            <p className="text-sm text-[var(--room-text-secondary)] mb-8">
              Before the show begins, you&apos;ll answer a few conversation cards. We&apos;ll use AI to match you with a like-minded viewer to watch with.
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

        {/* ─── Conversation Cards ─── */}
        {phase === "cards" && (
          <motion.div
            key="cards-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-8 max-w-4xl w-full mx-4"
            ref={cardContainerRef}
          >
            {/* Left: Global countdown */}
            <div className="flex-shrink-0 text-center w-28">
              <div className="relative w-24 h-24 mx-auto mb-3">
                {/* Circular progress ring */}
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle
                    cx="48" cy="48" r="42"
                    fill="none"
                    stroke="var(--room-surface)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="48" cy="48" r="42"
                    fill="none"
                    stroke="var(--room-accent)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - globalTimeLeft / countdownDuration)}`}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-mono font-bold text-[var(--room-text)]">
                    {formatTime(globalTimeLeft)}
                  </span>
                </div>
              </div>
              <p className="text-[9px] tracking-[0.2em] uppercase text-[var(--room-text-muted)]">
                Until Screening
              </p>

              {/* Card indicators */}
              <div className="flex gap-1.5 justify-center mt-4">
                {ICEBREAKER_CARDS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i < currentCardIndex
                        ? "bg-[var(--room-accent)] scale-100"
                        : i === currentCardIndex
                        ? "bg-[var(--room-gold)] scale-125"
                        : "bg-[var(--room-surface)] scale-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Center: Card with GSAP 3D */}
            <div className="flex-1" style={{ transformStyle: "preserve-3d" }}>
              <div ref={cardRef} key={`card-${currentCardIndex}`} style={{ transformStyle: "preserve-3d" }}>
                {/* Card timer bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[10px] text-[var(--room-text-muted)] mb-1.5">
                    <span className="tracking-[0.15em] uppercase">
                      Card {currentCardIndex + 1} of {ICEBREAKER_CARDS.length}
                    </span>
                    <span className={`font-mono ${cardTimeLeft <= 10 ? "text-[var(--room-red)]" : ""}`}>
                      {cardTimeLeft}s left
                    </span>
                  </div>
                  <div className="h-1 bg-[var(--room-surface)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 linear ${cardTimeLeft <= 10 ? "bg-[var(--room-red)]" : "bg-[var(--room-accent)]"}`}
                      style={{ width: `${100 - cardProgress}%` }}
                    />
                  </div>
                </div>

                {/* The card itself — image + input with 3D depth */}
                <div className="icebreaker-card overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
                  {/* Card image with parallax */}
                  <div className="relative w-full card-image overflow-hidden" style={{ maxHeight: "360px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.image}
                      alt={`${card.author}: ${card.prompt}`}
                      className="w-full h-auto object-contain"
                      style={{ maxHeight: "360px", willChange: "transform" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const fallback = (e.target as HTMLImageElement).nextElementSibling;
                        if (fallback) (fallback as HTMLElement).style.display = "block";
                      }}
                    />
                    {/* Text fallback (hidden by default, shown if image fails) */}
                    <div className="card-prompt-text p-8 text-center" style={{ display: "none" }}>
                      <p className="text-[9px] tracking-[0.25em] uppercase text-[var(--room-text-muted)] mb-6">
                        The Diary of a CEO Conversation Cards
                      </p>
                      <p className="text-xl font-medium leading-relaxed mb-2 icebreaker-prompt">
                        {card.prompt}
                      </p>
                      <p className="text-xs text-[var(--room-text-muted)]">
                        — {card.author}
                      </p>
                    </div>
                  </div>

                  {/* Input area */}
                  <div className="card-input-area p-6 space-y-3">
                    <input
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                      className="room-input text-sm"
                      placeholder="Type your answer..."
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={submitAnswer}
                        disabled={!answer.trim()}
                        className="btn-accent flex-1 text-sm"
                      >
                        Submit
                      </button>
                      <button
                        onClick={() => {
                          if (cardRef.current) {
                            gsap.to(cardRef.current, {
                              opacity: 0,
                              x: -60,
                              rotateY: -8,
                              duration: 0.3,
                              ease: "power2.in",
                              onComplete: () => {
                                setAnswer("");
                                advanceCard();
                              },
                            });
                          } else {
                            setAnswer("");
                            advanceCard();
                          }
                        }}
                        className="btn-ghost text-sm px-4"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Matching Phase ─── */}
        {phase === "matching" && (
          <motion.div
            key="matching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center max-w-md mx-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-[var(--room-accent)] border-t-transparent"
            />
            <p className="text-lg font-medium mb-2">Finding your match</p>
            <p className="text-sm text-[var(--room-text-secondary)]">
              Analyzing your answers to find a kindred spirit...
            </p>
            <p className="text-[10px] text-[var(--room-text-muted)] mt-3">
              Powered by Claude AI
            </p>
          </motion.div>
        )}

        {/* ─── Match Reveal ─── */}
        {phase === "reveal" && match && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-lg w-full mx-4"
          >
            <div className="text-center mb-6">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[10px] tracking-[0.3em] uppercase text-[var(--room-gold)] font-medium"
              >
                Your Connection for Tonight
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="match-card p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-[var(--room-surface-hover)] border border-[var(--room-border-active)] flex items-center justify-center text-[var(--room-text)] text-xl font-bold flex-shrink-0">
                  {match.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{match.name}</h3>
                  <p className="text-xs text-[var(--room-text-muted)]">Matched by Claude AI</p>
                </div>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-[var(--room-bg)] border border-[var(--room-border)]">
                <p className="text-xs text-[var(--room-accent)] font-medium mb-1">Why you were matched</p>
                <p className="text-sm text-[var(--room-text-secondary)] leading-relaxed">
                  {match.reason}
                </p>
              </div>

              {match.answers.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-[var(--room-text-muted)]">Their answers</p>
                  {match.answers.map((a, i) => (
                    <p key={i} className="text-xs text-[var(--room-text-secondary)] italic pl-3 border-l-2 border-[var(--room-border)]">
                      &ldquo;{a}&rdquo;
                    </p>
                  ))}
                </div>
              )}

              <button onClick={onComplete} className="btn-accent w-full text-sm py-3 mt-2">
                Enter the Screening Room
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";

const SCREENING_CARDS = [
  { prompt: "When was the last time a day flew by and what were you doing?", author: "Payal Kadakia", image: "/cards/card-1-payal-kadakia.JPG" },
  { prompt: "What did you learn from your greatest failure?", author: "Sir Richard Branson", image: "/cards/card-2-richard-branson.JPG" },
  { prompt: "What are you clear about now that one year ago you didn't know?", author: "Chris Voss", image: "/cards/card-3-chris-voss.JPG" },
  { prompt: "When was the last time you changed your mind about something life-changing?", author: "Africa Brooke", image: "/cards/card-4-africa-brooke.JPG" },
  { prompt: "Do you think your younger self would be proud / look up to you now?", author: "Lewis Capaldi", image: "/cards/card-5-lewis-capaldi.JPG" },
];

const CARD_DURATION = 120; // 2 minutes per card

interface Props {
  eventId: string;
  viewerId: string;
  onRespond?: (prompt: string, answer: string) => void;
  onAllDone?: () => void;
}

export default function ScreeningCards({ eventId, viewerId, onRespond, onAllDone }: Props) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(CARD_DURATION);
  const [allDone, setAllDone] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Per-card timer
  useEffect(() => {
    if (allDone) return;
    setTimeLeft(CARD_DURATION);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => advanceCard(), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCardIndex, allDone]);

  // GSAP card entrance
  useEffect(() => {
    if (!cardRef.current || allDone) return;
    gsap.fromTo(cardRef.current, {
      opacity: 0,
      x: 60,
      rotateY: 8,
      transformPerspective: 1200,
    }, {
      opacity: 1,
      x: 0,
      rotateY: 0,
      duration: 0.6,
      ease: "power3.out",
    });
  }, [currentCardIndex, allDone]);

  // 3D tilt on hover
  useEffect(() => {
    if (!cardRef.current || allDone) return;
    const el = cardRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(el, {
        rotateY: x * 6,
        rotateX: -y * 4,
        transformPerspective: 1200,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.5, ease: "power3.out" });
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [currentCardIndex, allDone]);

  const advanceCard = () => {
    // Save any pending answer
    if (answer.trim()) {
      submitCurrentAnswer();
    }

    if (currentCardIndex < SCREENING_CARDS.length - 1) {
      if (cardRef.current) {
        gsap.to(cardRef.current, {
          opacity: 0,
          x: -60,
          rotateY: -6,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            setCurrentCardIndex((i) => i + 1);
            setAnswer("");
          },
        });
      } else {
        setCurrentCardIndex((i) => i + 1);
        setAnswer("");
      }
    } else {
      setAllDone(true);
    }
  };

  const submitCurrentAnswer = () => {
    if (!answer.trim()) return;
    const card = SCREENING_CARDS[currentCardIndex];

    onRespond?.(card.prompt, answer.trim());

    fetch("/api/icebreaker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        viewer_id: viewerId,
        prompt: card.prompt,
        answer: answer.trim(),
        signal_type: "conversation_card",
      }),
    }).catch(() => {});
  };

  const handleSubmit = () => {
    if (!answer.trim()) return;
    submitCurrentAnswer();
    setAnswer("");
    advanceCard();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (allDone) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--room-gold)] font-medium mb-3">
          All cards answered
        </p>
        <p className="text-sm text-[var(--room-text-secondary)] mb-4">
          Great reflections! Enjoy the rest of the screening.
        </p>
        {onAllDone && (
          <button onClick={onAllDone} className="btn-accent text-sm py-3 px-8">
            Enter the Screening Room
          </button>
        )}
      </div>
    );
  }

  const card = SCREENING_CARDS[currentCardIndex];
  const cardProgress = ((CARD_DURATION - timeLeft) / CARD_DURATION) * 100;

  return (
    <div className="flex flex-col h-full p-4" style={{ perspective: "1200px" }}>
      {/* Card progress header */}
      <div className="mb-3 flex-shrink-0">
        <div className="flex items-center justify-between text-[10px] text-[var(--room-text-muted)] mb-1.5">
          <span className="tracking-[0.15em] uppercase">
            Card {currentCardIndex + 1} of {SCREENING_CARDS.length}
          </span>
          <span className={`font-mono ${timeLeft <= 15 ? "text-[var(--room-red)]" : ""}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="h-1 bg-[var(--room-surface)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 linear ${timeLeft <= 15 ? "bg-[var(--room-red)]" : "bg-[var(--room-accent)]"}`}
            style={{ width: `${cardProgress}%` }}
          />
        </div>
        {/* Card dots */}
        <div className="flex gap-1.5 justify-center mt-2">
          {SCREENING_CARDS.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i < currentCardIndex
                  ? "bg-[var(--room-accent)]"
                  : i === currentCardIndex
                  ? "bg-[var(--room-gold)] scale-125"
                  : "bg-[var(--room-surface)]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 min-h-0 overflow-y-auto" ref={cardRef} style={{ transformStyle: "preserve-3d" }}>
        <div className="icebreaker-card overflow-hidden">
          {/* Card image */}
          <div className="relative w-full" style={{ maxHeight: "300px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image}
              alt={`${card.author}: ${card.prompt}`}
              className="w-full h-auto object-contain"
              style={{ maxHeight: "300px" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                const fallback = (e.target as HTMLImageElement).nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = "block";
              }}
            />
            {/* Text fallback */}
            <div className="p-6 text-center" style={{ display: "none" }}>
              <p className="text-[9px] tracking-[0.25em] uppercase text-[var(--room-text-muted)] mb-4">
                Conversation Cards
              </p>
              <p className="text-lg font-medium leading-relaxed mb-2 icebreaker-prompt">
                {card.prompt}
              </p>
              <p className="text-xs text-[var(--room-text-muted)]">
                — {card.author}
              </p>
            </div>
          </div>

          {/* Input */}
          <div className="p-4 space-y-2">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="room-input text-sm"
              placeholder="Share your thoughts..."
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!answer.trim()}
                className="btn-accent flex-1 text-sm"
              >
                Share
              </button>
              <button
                onClick={() => { setAnswer(""); advanceCard(); }}
                className="btn-ghost text-sm px-3"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import gsap from "gsap";

// 2 cards per interest group — viewers get a mix-matched set of 4
const CARDS_BY_SEGMENT: Record<string, { prompt: string; author: string; image: string }[]> = {
  Reflection: [
    { prompt: "When was the last time a day flew by and what were you doing?", author: "Payal Kadakia", image: "/cards/card-1-payal-kadakia.JPG" },
    { prompt: "What are you clear about now that one year ago you didn't know?", author: "Chris Voss", image: "/cards/card-3-chris-voss.JPG" },
  ],
  Building: [
    { prompt: "What did you learn from your greatest failure?", author: "Sir Richard Branson", image: "/cards/card-2-richard-branson.JPG" },
    { prompt: "When was the last time you changed your mind about something life-changing?", author: "Africa Brooke", image: "/cards/card-4-africa-brooke.JPG" },
  ],
  Creativity: [
    { prompt: "Do you think your younger self would be proud / look up to you now?", author: "Lewis Capaldi", image: "/cards/card-5-lewis-capaldi.JPG" },
    { prompt: "When was the last time a day flew by and what were you doing?", author: "Payal Kadakia", image: "/cards/card-1-payal-kadakia.JPG" },
  ],
  Connection: [
    { prompt: "When was the last time you changed your mind about something life-changing?", author: "Africa Brooke", image: "/cards/card-4-africa-brooke.JPG" },
    { prompt: "What did you learn from your greatest failure?", author: "Sir Richard Branson", image: "/cards/card-2-richard-branson.JPG" },
  ],
};

// All unique cards as fallback
const ALL_CARDS = [
  { prompt: "When was the last time a day flew by and what were you doing?", author: "Payal Kadakia", image: "/cards/card-1-payal-kadakia.JPG" },
  { prompt: "What did you learn from your greatest failure?", author: "Sir Richard Branson", image: "/cards/card-2-richard-branson.JPG" },
  { prompt: "What are you clear about now that one year ago you didn't know?", author: "Chris Voss", image: "/cards/card-3-chris-voss.JPG" },
  { prompt: "When was the last time you changed your mind about something life-changing?", author: "Africa Brooke", image: "/cards/card-4-africa-brooke.JPG" },
];

const CARD_DURATION = 45; // ~45 seconds per card

interface Props {
  eventId: string;
  viewerId: string;
  segment?: string;
  onRespond?: (prompt: string, answer: string) => void;
  onAllDone?: () => void;
  onCardChange?: (prompt: string, author: string) => void;
}

// Build a mix-matched deck: 2 cards from the viewer's segment + 2 from other groups
function buildDeck(segment?: string) {
  if (!segment || !CARDS_BY_SEGMENT[segment]) return ALL_CARDS;

  const own = CARDS_BY_SEGMENT[segment];
  const otherSegments = Object.keys(CARDS_BY_SEGMENT).filter(s => s !== segment);

  // Pick 1 card from each of 2 other segments
  const others: typeof own = [];
  const shuffled = otherSegments.sort(() => Math.random() - 0.5);
  for (const s of shuffled) {
    if (others.length >= 2) break;
    const pool = CARDS_BY_SEGMENT[s];
    // Pick a card that isn't already in own
    const pick = pool.find(c => !own.some(o => o.prompt === c.prompt));
    if (pick) others.push(pick);
  }

  // Fill remaining if needed
  while (others.length < 2) {
    const remaining = ALL_CARDS.find(c =>
      !own.some(o => o.prompt === c.prompt) && !others.some(o => o.prompt === c.prompt)
    );
    if (remaining) others.push(remaining);
    else break;
  }

  // Interleave: own card, other card, own card, other card
  return [own[0], others[0], own[1], others[1]].filter(Boolean);
}

export default function ScreeningCards({ eventId, viewerId, segment, onRespond, onAllDone, onCardChange }: Props) {
  const deck = useMemo(() => buildDeck(segment), [segment]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
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

  // Notify parent of current card prompt (for chat context)
  useEffect(() => {
    if (allDone) return;
    const card = deck[currentCardIndex];
    if (card) onCardChange?.(card.prompt, card.author);
  }, [currentCardIndex, allDone, onCardChange, deck]);

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
    if (currentCardIndex < deck.length - 1) {
      if (cardRef.current) {
        gsap.to(cardRef.current, {
          opacity: 0,
          x: -60,
          rotateY: -6,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            setCurrentCardIndex((i) => i + 1);
          },
        });
      } else {
        setCurrentCardIndex((i) => i + 1);
      }
    } else {
      setAllDone(true);
    }
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

  const card = deck[currentCardIndex];
  if (!card) return null;

  return (
    <div className="flex flex-col items-center justify-center h-full p-4" style={{ perspective: "1200px" }}>
      {/* Minimal progress — card count + timer */}
      <div className="mb-4 flex items-center gap-3 flex-shrink-0">
        <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--room-text-muted)]">
          Card {currentCardIndex + 1} of {deck.length}
        </span>
        <span className={`text-[10px] font-mono ${timeLeft <= 10 ? "text-[var(--room-red)]" : "text-[var(--room-text-muted)]"}`}>
          {formatTime(timeLeft)}
        </span>
      </div>

      {/* Card dots */}
      <div className="flex gap-1.5 justify-center mb-4 flex-shrink-0">
        {deck.map((_, i) => (
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

      {/* Card — just the image floating, no container */}
      <div ref={cardRef} style={{ transformStyle: "preserve-3d" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.image}
          alt={`${card.author}: ${card.prompt}`}
          className="max-h-[340px] w-auto object-contain rounded-sm"
          style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.5))" }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            const fallback = (e.target as HTMLImageElement).nextElementSibling;
            if (fallback) (fallback as HTMLElement).style.display = "block";
          }}
        />
        {/* Text fallback if image fails */}
        <div className="p-8 text-center max-w-md" style={{ display: "none" }}>
          <p className="text-[9px] tracking-[0.25em] uppercase text-[var(--room-text-muted)] mb-4">
            Conversation Cards
          </p>
          <p className="text-xl font-medium leading-relaxed mb-3 icebreaker-prompt">
            {card.prompt}
          </p>
          <p className="text-xs text-[var(--room-text-muted)]">
            — {card.author}
          </p>
        </div>
      </div>

      {/* Skip link — subtle, timer handles auto-advance */}
      <button
        onClick={advanceCard}
        className="mt-4 text-[10px] text-[var(--room-text-muted)] hover:text-[var(--room-text)] transition-colors tracking-wider uppercase"
      >
        Next card
      </button>
    </div>
  );
}

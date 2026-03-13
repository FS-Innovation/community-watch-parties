"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getViewerId, getViewerName, setViewerName } from "@/lib/viewer";
import type { PreShowPhase } from "@/lib/types";

interface ChatMessage {
  id: string;
  viewer_id: string;
  display_name: string;
  text: string;
  timestamp: number;
}

interface Props {
  eventId: string;
  isOpen: boolean;
  onToggle: () => void;
  inline?: boolean;
  cardPrompt?: string | null;
  cardImage?: string | null;
  cardAuthor?: string | null;
  cardIndex?: number;
  totalCards?: number;
  cardTimeLeft?: number;
  phase?: PreShowPhase | null;
  roomName?: string;
}

export default function ChatPanel({
  eventId, isOpen, onToggle, inline,
  cardPrompt, cardImage, cardAuthor,
  cardIndex = 0, totalCards = 0, cardTimeLeft = 0,
  phase, roomName,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewerId = typeof window !== "undefined" ? getViewerId() : "";

  useEffect(() => {
    const saved = getViewerName();
    if (saved) {
      setDisplayName(saved);
      setNameSet(true);
    }
  }, []);

  // Poll for messages
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?event_id=${eventId}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch { /* ignore */ }
  }, [eventId]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !displayName.trim()) return;

    if (!nameSet) {
      setViewerName(displayName);
      setNameSet(true);
    }

    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      viewer_id: viewerId,
      display_name: displayName,
      text: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, msg]);
    setInput("");

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, ...msg }),
    }).catch(() => {});
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Inline mode: card + chat combined
  if (inline) {
    const showCard = cardImage && (phase === "warmup" || phase === "arrival");

    return (
      <div
        className="relative flex flex-col h-full w-full overflow-hidden"
        style={{ background: "linear-gradient(165deg, #1a1a2e 0%, #0f0f17 55%, #12121e 100%)" }}
      >
        {/* Left edge accent line */}
        <div
          className="absolute top-0 left-0 bottom-0 w-[2px] pointer-events-none"
          style={{ background: "linear-gradient(180deg, #7c5cfc 0%, #a78bfa 50%, #7c5cfc 100%)" }}
        />

        {/* Room name header */}
        {roomName && (
          <div className="flex-shrink-0 px-4 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-white/90">{roomName}</h2>
          </div>
        )}

        {/* Card image — hero content at top of chat */}
        {showCard && (
          <div className="flex-shrink-0 p-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Card count + timer */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: "#a78bfa" }}>
                Break the ice
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-white/35 tracking-wider uppercase">
                  {cardIndex + 1} of {totalCards}
                </span>
                {cardTimeLeft > 0 && totalCards > 1 && cardIndex < totalCards - 1 && (
                  <span className="text-[9px] text-white/25 font-mono">
                    next in {formatTime(cardTimeLeft)}
                  </span>
                )}
              </div>
            </div>
            {/* Card image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardImage}
              alt={cardPrompt || "Conversation card"}
              className="w-full rounded-lg object-contain"
              style={{
                maxHeight: "240px",
                filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.3))",
              }}
            />
          </div>
        )}

        {/* Text fallback if no image but has prompt */}
        {!showCard && cardPrompt && (
          <div className="flex-shrink-0 px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(167,139,250,0.06)" }}
          >
            <p className="text-[9px] tracking-[0.2em] uppercase font-semibold mb-1.5" style={{ color: "#a78bfa" }}>
              Break the ice
            </p>
            <p className="text-[13px] text-white/75 leading-relaxed font-medium italic">
              &ldquo;{cardPrompt}&rdquo;
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <p className="text-sm text-white/40">No messages yet</p>
              <p className="text-xs text-white/25">Be the first to say something</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-sm ${msg.viewer_id === viewerId ? "text-right" : ""}`}
            >
              <span className="text-[10px] text-white/40">{msg.display_name}</span>
              <div
                className={`mt-0.5 inline-block px-3 py-2 rounded-xl text-[13px] max-w-[85%] ${
                  msg.viewer_id === viewerId
                    ? "rounded-br-sm text-white"
                    : "rounded-bl-sm text-white/85"
                }`}
                style={msg.viewer_id === viewerId
                  ? { background: "rgba(124,92,252,0.35)", border: "1px solid rgba(124,92,252,0.25)" }
                  : { background: "rgba(255,255,255,0.08)" }
                }
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="relative p-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          {!nameSet && (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && displayName.trim()) {
                  setViewerName(displayName);
                  setNameSet(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }
              }}
              className="w-full px-3 py-3 rounded-xl text-sm mb-2 outline-none transition-all text-white placeholder:text-white/35"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,92,252,0.5)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              placeholder="Enter your name to chat..."
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 px-3 py-3 rounded-xl text-sm outline-none transition-all text-white placeholder:text-white/35 disabled:opacity-25"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,92,252,0.5)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              placeholder={nameSet ? (cardPrompt ? "Share your thoughts..." : "Type a message...") : "Set your name first..."}
              disabled={!nameSet}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !nameSet}
              className="px-4 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              style={{
                background: input.trim() && nameSet ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.07)",
                color: input.trim() && nameSet ? "white" : "rgba(255,255,255,0.4)",
                border: `1px solid ${input.trim() && nameSet ? "rgba(124,92,252,0.35)" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fixed mode (legacy fallback)
  return (
    <>
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-[55] w-12 h-12 rounded-full bg-[var(--room-surface)] border border-[var(--room-border)] flex items-center justify-center hover:border-[var(--room-accent)] transition-colors shadow-lg"
        title={isOpen ? "Close chat" : "Open chat"}
      >
        <svg className="w-5 h-5 text-[var(--room-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          )}
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-80 lg:w-96 z-[55] flex flex-col chat-panel"
          >
            <div className="p-4 border-b border-[var(--room-border)] flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-sm">Chat</h3>
                <p className="text-[10px] text-[var(--room-text-muted)]">Whisper in the dark</p>
              </div>
              <button onClick={onToggle} className="text-[var(--room-text-muted)] hover:text-[var(--room-text)] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <p className="text-xs text-[var(--room-text-muted)] text-center py-8">No messages yet. Say something...</p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`text-sm ${msg.viewer_id === viewerId ? "text-right" : ""}`}>
                  <span className="text-[10px] text-[var(--room-text-muted)]">{msg.display_name}</span>
                  <div className={`mt-0.5 inline-block px-3 py-1.5 rounded-xl text-xs max-w-[85%] ${
                    msg.viewer_id === viewerId
                      ? "bg-[var(--room-surface-hover)] text-[var(--room-text)] border border-[var(--room-border-active)] rounded-br-sm"
                      : "bg-[var(--room-surface)] text-[var(--room-text)] rounded-bl-sm"
                  }`}>{msg.text}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-[var(--room-border)] flex-shrink-0 space-y-2">
              {!nameSet && (
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="room-input text-xs" placeholder="Your name" />
              )}
              <div className="flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} className="room-input flex-1 text-xs" placeholder="Type a message..." autoFocus />
                <button onClick={sendMessage} disabled={!input.trim() || !displayName.trim()} className="btn-accent text-xs px-3">Send</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

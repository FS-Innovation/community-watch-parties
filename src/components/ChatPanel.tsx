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
  phase?: PreShowPhase | null;
}

export default function ChatPanel({ eventId, isOpen, onToggle, inline, cardPrompt, phase }: Props) {
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

    // Optimistic update
    setMessages((prev) => [...prev, msg]);
    setInput("");

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, ...msg }),
    }).catch(() => {});
  };

  // Inline mode: renders as a flex column filling parent container
  // Glassmorphic during social phases (arrival, warmup), fades to minimal during build/silence
  const isSocialPhase = !phase || phase === "arrival" || phase === "warmup";

  if (inline) {
    return (
      <div
        className={`relative flex flex-col h-full w-full overflow-hidden transition-all duration-1000 ${
          isSocialPhase
            ? "bg-white/[0.04] backdrop-blur-xl"
            : "bg-transparent backdrop-blur-none"
        }`}
        style={isSocialPhase ? {
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 40px rgba(255,255,255,0.02)",
        } : undefined}
      >
        {/* Subtle glass shine on left edge */}
        {isSocialPhase && (
          <div
            className="absolute top-0 left-0 bottom-0 w-px pointer-events-none"
            style={{ background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.06) 70%, transparent)" }}
          />
        )}

        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className={`font-semibold text-sm transition-colors duration-700 ${isSocialPhase ? "text-white/90" : "text-white/50"}`}>Chat</h3>
            <p className={`text-[10px] transition-colors duration-700 ${isSocialPhase ? "text-white/40" : "text-white/20"}`}>Whisper in the dark</p>
          </div>
          <button onClick={onToggle} className="text-[var(--room-text-muted)] hover:text-[var(--room-text)] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card prompt context — shows what the current conversation card is */}
        {cardPrompt && (
          <div className={`px-4 py-3 border-b border-white/[0.06] flex-shrink-0 transition-colors duration-700 ${
            isSocialPhase ? "bg-white/[0.04]" : "bg-white/[0.02]"
          }`}>
            <p className="text-[9px] tracking-[0.2em] uppercase text-amber-400/70 mb-1">Discussing</p>
            <p className={`text-xs leading-relaxed italic transition-colors duration-700 ${
              isSocialPhase ? "text-white/60" : "text-white/30"
            }`}>
              &ldquo;{cardPrompt}&rdquo;
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && (
            <p className={`text-xs text-center py-8 transition-colors duration-700 ${
              isSocialPhase ? "text-white/30" : "text-white/15"
            }`}>
              No messages yet. Say something...
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-sm ${msg.viewer_id === viewerId ? "text-right" : ""}`}
            >
              <span className="text-[10px] text-white/40">{msg.display_name}</span>
              <div
                className={`mt-0.5 inline-block px-3 py-1.5 rounded-xl text-xs max-w-[85%] ${
                  msg.viewer_id === viewerId
                    ? "bg-white/[0.1] text-white/90 border border-white/[0.12] rounded-br-sm"
                    : "bg-white/[0.06] text-white/80 rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input — always visible at bottom */}
        <div className={`p-3 border-t border-white/[0.08] flex-shrink-0 transition-colors duration-700 ${
          isSocialPhase ? "bg-white/[0.03]" : "bg-transparent"
        }`}>
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
              className="w-full px-3 py-2.5 rounded-lg text-xs mb-2 outline-none transition-colors bg-white/[0.08] border border-white/[0.12] text-white/90 placeholder:text-white/30 focus:border-white/25 focus:bg-white/[0.1]"
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
              className="flex-1 px-3 py-2.5 rounded-lg text-xs outline-none transition-colors bg-white/[0.08] border border-white/[0.12] text-white/90 placeholder:text-white/30 focus:border-white/25 focus:bg-white/[0.1] disabled:opacity-30"
              placeholder={nameSet ? (cardPrompt ? "Share your thoughts..." : "Type a message...") : "Set your name first..."}
              disabled={!nameSet}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !nameSet}
              className="px-3 py-2.5 rounded-lg text-xs font-semibold transition-all bg-white/[0.15] text-white/90 border border-white/[0.12] hover:bg-white/[0.2] disabled:opacity-30 disabled:cursor-not-allowed"
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
      {/* Toggle button */}
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
        {!isOpen && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--room-accent)] text-[10px] font-bold text-white flex items-center justify-center">
            {messages.length > 99 ? "99" : messages.length}
          </span>
        )}
      </button>

      {/* Slide-in panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-80 lg:w-96 z-[55] flex flex-col chat-panel"
          >
            {/* Header */}
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <p className="text-xs text-[var(--room-text-muted)] text-center py-8">
                  No messages yet. Say something...
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`text-sm ${msg.viewer_id === viewerId ? "text-right" : ""}`}
                >
                  <span className="text-[10px] text-[var(--room-text-muted)]">{msg.display_name}</span>
                  <div
                    className={`mt-0.5 inline-block px-3 py-1.5 rounded-xl text-xs max-w-[85%] ${
                      msg.viewer_id === viewerId
                        ? "bg-[var(--room-surface-hover)] text-[var(--room-text)] border border-[var(--room-border-active)] rounded-br-sm"
                        : "bg-[var(--room-surface)] text-[var(--room-text)] rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[var(--room-border)] flex-shrink-0 space-y-2">
              {!nameSet && (
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="room-input text-xs"
                  placeholder="Your name"
                />
              )}
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="room-input flex-1 text-xs"
                  placeholder="Type a message..."
                  autoFocus
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || !displayName.trim()}
                  className="btn-accent text-xs px-3"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

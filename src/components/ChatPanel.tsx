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
  // Bright & spotlit during social phases, fades during build/silence
  const isSocialPhase = !phase || phase === "arrival" || phase === "warmup";

  if (inline) {
    return (
      <div
        className="relative flex flex-col h-full w-full overflow-hidden"
        style={{
          background: isSocialPhase
            ? "linear-gradient(180deg, rgba(30,32,45,0.98) 0%, rgba(22,24,35,0.97) 40%, rgba(18,20,30,0.98) 100%)"
            : "rgba(10,10,15,0.6)",
          transition: "background 1s ease",
        }}
      >
        {/* Backlight glow — soft radial spotlight behind the panel */}
        {isSocialPhase && (
          <>
            <div
              className="absolute -top-20 -left-20 w-[200%] h-60 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(168,140,255,0.08) 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute -bottom-10 left-0 right-0 h-40 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 80% 100% at 50% 100%, rgba(168,140,255,0.05) 0%, transparent 70%)",
              }}
            />
            {/* Left edge glow line */}
            <div
              className="absolute top-0 left-0 bottom-0 w-[2px] pointer-events-none"
              style={{ background: "linear-gradient(180deg, rgba(168,140,255,0.3) 0%, rgba(168,140,255,0.08) 50%, rgba(168,140,255,0.2) 100%)" }}
            />
          </>
        )}

        {/* Header */}
        <div className="relative px-4 py-3 border-b border-white/[0.1] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-[15px] text-white">Chat</h3>
            <p className="text-[10px] text-white/50">Say hello to your room</p>
          </div>
          <button onClick={onToggle} className="text-white/40 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Icebreaker prompt — the card question as context */}
        {cardPrompt && (
          <div className="relative px-4 py-3 border-b border-white/[0.08] flex-shrink-0"
            style={{ background: "rgba(168,140,255,0.06)" }}
          >
            <p className="text-[9px] tracking-[0.2em] uppercase font-semibold mb-1.5"
              style={{ color: "rgba(168,140,255,0.9)" }}
            >
              Break the ice
            </p>
            <p className="text-[13px] text-white/80 leading-relaxed font-medium italic">
              &ldquo;{cardPrompt}&rdquo;
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(168,140,255,0.1)", border: "1px solid rgba(168,140,255,0.15)" }}
              >
                <svg className="w-5 h-5" style={{ color: "rgba(168,140,255,0.7)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-white/50">No messages yet</p>
              <p className="text-xs text-white/30">Be the first to say something</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-sm ${msg.viewer_id === viewerId ? "text-right" : ""}`}
            >
              <span className="text-[10px] text-white/50">{msg.display_name}</span>
              <div
                className={`mt-0.5 inline-block px-3 py-2 rounded-xl text-[13px] max-w-[85%] ${
                  msg.viewer_id === viewerId
                    ? "rounded-br-sm text-white"
                    : "rounded-bl-sm text-white/90"
                }`}
                style={msg.viewer_id === viewerId
                  ? { background: "rgba(168,140,255,0.2)", border: "1px solid rgba(168,140,255,0.15)" }
                  : { background: "rgba(255,255,255,0.08)" }
                }
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input — always visible at bottom */}
        <div className="relative p-3 border-t border-white/[0.1] flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.03)" }}
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
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(168,140,255,0.4)";
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(168,140,255,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
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
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(168,140,255,0.4)";
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(168,140,255,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
              placeholder={nameSet ? (cardPrompt ? "Share your thoughts..." : "Type a message...") : "Set your name first..."}
              disabled={!nameSet}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !nameSet}
              className="px-4 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              style={{
                background: input.trim() && nameSet ? "rgba(168,140,255,0.3)" : "rgba(255,255,255,0.1)",
                color: input.trim() && nameSet ? "white" : "rgba(255,255,255,0.6)",
                border: `1px solid ${input.trim() && nameSet ? "rgba(168,140,255,0.3)" : "rgba(255,255,255,0.1)"}`,
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

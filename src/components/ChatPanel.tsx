"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  userName: string;
}

export default function ChatPanel({ userName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "system-1",
      user_name: "System",
      message: "Welcome to the DOAC Watch Party. The screening will begin shortly.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      user_name: userName,
      message: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    // TODO: Emit via Socket.io when connected
  }

  const reactions = ["🔥", "👏", "💡", "😂", "❤️"];

  function handleReaction(emoji: string) {
    const reactionMsg: ChatMessage = {
      id: `react-${Date.now()}`,
      user_name: userName,
      message: emoji,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, reactionMsg]);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--doac-border)]">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-[var(--doac-text-muted)]">
          Live Chat
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="animate-fade-in">
            <span className="text-xs font-semibold text-[var(--doac-orange)]">
              {msg.user_name}
            </span>
            <p className="text-sm text-[var(--doac-text)] leading-relaxed">
              {msg.message}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reactions */}
      <div className="px-4 py-2 flex gap-2 border-t border-[var(--doac-border)]">
        {reactions.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="text-lg hover:scale-125 transition-transform cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="px-4 py-3 border-t border-[var(--doac-border)]"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Say something..."
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--doac-dark)] border border-[var(--doac-border)] text-sm text-[var(--doac-text)] placeholder:text-[var(--doac-text-muted)] focus:outline-none focus:border-[var(--doac-orange)]"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[var(--doac-orange)] text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

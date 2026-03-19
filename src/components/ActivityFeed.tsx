"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ActivityType } from "@/lib/types";

interface ActivityItem {
  id: string;
  type: ActivityType;
  viewer_id: string | null;
  display_name: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface Props {
  eventId: string;
  maxItems?: number;
}

const TYPE_ICONS: Record<ActivityType, string> = {
  chat: "💬",
  reaction: "",
  milestone: "🎯",
  join: "👋",
  reaction_prompt: "✨",
  poll_result: "📊",
  this_or_that: "⚡",
  word_cloud: "☁️",
  highlight: "⭐",
  system: "📢",
};

export default function ActivityFeed({ eventId, maxItems = 50 }: Props) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const url = lastFetchRef.current
        ? `/api/activity?event_id=${eventId}&after=${encodeURIComponent(lastFetchRef.current)}&limit=${maxItems}`
        : `/api/activity?event_id=${eventId}&limit=${maxItems}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        setItems(prev => {
          const merged = [...prev, ...data.items];
          const unique = merged.filter((item, idx, arr) =>
            arr.findIndex(i => i.id === item.id) === idx
          );
          return unique.slice(-maxItems);
        });
        lastFetchRef.current = data.items[data.items.length - 1].created_at;
      }
    } catch { /* ignore */ }
  }, [eventId, maxItems]);

  useEffect(() => {
    loadItems();
    const interval = setInterval(loadItems, 3000);
    return () => clearInterval(interval);
  }, [loadItems]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  // Collapse consecutive reactions into a single line
  const collapsedItems = collapseReactions(items);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--room-border)]">
        <h3 className="text-xs tracking-[0.15em] uppercase text-[var(--room-text-muted)] font-semibold">
          Activity
        </h3>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1">
        <AnimatePresence initial={false}>
          {collapsedItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 py-1"
            >
              {item.type === "reaction" ? (
                <div className="flex items-center gap-1 text-sm">
                  <span>{item.content}</span>
                  {typeof item.metadata?.count === "number" && item.metadata.count > 0 && (
                    <span className="text-[10px] text-[var(--room-text-muted)]">
                      x{item.metadata.count}
                    </span>
                  )}
                </div>
              ) : item.type === "milestone" ? (
                <div className="flex items-center gap-2 py-1 px-2 rounded-lg bg-[var(--room-accent-glow)] w-full">
                  <span className="text-sm">{TYPE_ICONS[item.type]}</span>
                  <span className="text-xs text-[var(--room-accent)] font-medium">{item.content}</span>
                </div>
              ) : item.type === "join" ? (
                <span className="text-[11px] text-[var(--room-text-muted)]">
                  {TYPE_ICONS[item.type]} {item.display_name} joined
                </span>
              ) : item.type === "system" ? (
                <div className="text-center w-full py-1">
                  <span className="text-[10px] text-[var(--room-text-muted)] tracking-wider uppercase">
                    {item.content}
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-xs flex-shrink-0 mt-0.5">{TYPE_ICONS[item.type]}</span>
                  <div className="min-w-0">
                    {item.display_name && (
                      <span className="text-[10px] text-[var(--room-text-muted)] mr-1">
                        {item.display_name}
                      </span>
                    )}
                    <span className="text-xs text-[var(--room-text-secondary)]">{item.content}</span>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function collapseReactions(items: ActivityItem[]): ActivityItem[] {
  const result: ActivityItem[] = [];
  let reactionBatch: ActivityItem[] = [];

  for (const item of items) {
    if (item.type === "reaction") {
      reactionBatch.push(item);
    } else {
      if (reactionBatch.length > 0) {
        result.push(mergeReactions(reactionBatch));
        reactionBatch = [];
      }
      result.push(item);
    }
  }
  if (reactionBatch.length > 0) {
    result.push(mergeReactions(reactionBatch));
  }
  return result;
}

function mergeReactions(batch: ActivityItem[]): ActivityItem {
  const emojiCounts: Record<string, number> = {};
  for (const item of batch) {
    const emoji = item.content || "🔥";
    emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
  }
  const topEmoji = Object.entries(emojiCounts).sort((a, b) => b[1] - a[1]);
  const display = topEmoji.map(([e]) => e).join("");
  const total = batch.length;

  return {
    ...batch[batch.length - 1],
    content: display,
    metadata: { count: total },
  };
}

import { NextRequest, NextResponse } from "next/server";

// Reactions are ephemeral — NOT persisted.
// In production: broadcast via Supabase Realtime Broadcast
// supabase.channel(`reactions:${event_id}`).send({ type: 'broadcast', event: 'reaction', payload: { emoji, viewer_id } })

// Server-side rate limit tracking
const lastReaction: Record<string, number> = {};

export async function POST(request: NextRequest) {
  const { event_id, viewer_id, emoji } = await request.json();

  if (!event_id || !viewer_id || !emoji) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Rate limit: 1 per viewer per 3 seconds
  const key = `${event_id}:${viewer_id}`;
  const now = Date.now();
  if (lastReaction[key] && now - lastReaction[key] < 3000) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  lastReaction[key] = now;

  // In production: broadcast to all connected clients
  // For now, just acknowledge
  return NextResponse.json({ success: true });
}

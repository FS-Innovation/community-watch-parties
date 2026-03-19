import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// Server-side rate limit tracking
const lastReaction: Record<string, number> = {};

// GET: Fetch reaction counts for analytics / audience pulse
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";
  const windowSeconds = parseInt(request.nextUrl.searchParams.get("window") || "30");

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
      const { count } = await supabase
        .from("reactions")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .gte("created_at", since);

      return NextResponse.json({ count: count || 0, window: windowSeconds });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ count: 0, window: windowSeconds });
}

// POST: Send a reaction
export async function POST(request: NextRequest) {
  const { event_id, viewer_id, emoji, video_timestamp } = await request.json();

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

  // Persist reaction
  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      await supabase.from("reactions").insert({
        event_id,
        viewer_id,
        emoji,
        video_timestamp: video_timestamp || null,
      });

      // Also post to activity feed
      await supabase.from("activity_feed").insert({
        event_id,
        type: "reaction",
        viewer_id,
        content: emoji,
        metadata: { video_timestamp },
      });
    } catch { /* best effort */ }
  }

  return NextResponse.json({ success: true });
}

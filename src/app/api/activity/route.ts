import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// In-memory fallback
const activityStore: Record<string, Array<{
  id: string;
  type: string;
  viewer_id: string | null;
  display_name: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}>> = {};

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";
  const after = request.nextUrl.searchParams.get("after"); // ISO timestamp
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      let query = supabase
        .from("activity_feed")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (after) {
        query = query.gt("created_at", after);
      }

      const { data } = await query;
      return NextResponse.json({ items: (data || []).reverse() });
    } catch { /* fall through */ }
  }

  const items = activityStore[eventId] || [];
  const filtered = after
    ? items.filter(i => i.created_at > after)
    : items.slice(-limit);
  return NextResponse.json({ items: filtered });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { event_id, type, viewer_id, display_name, content, metadata } = body;

  if (!event_id || !type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const item = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    event_id,
    type,
    viewer_id: viewer_id || null,
    display_name: display_name || null,
    content: content || null,
    metadata: metadata || null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      await supabase.from("activity_feed").insert(item);
      return NextResponse.json({ success: true, item });
    } catch { /* fall through */ }
  }

  if (!activityStore[event_id]) activityStore[event_id] = [];
  activityStore[event_id].push(item);
  if (activityStore[event_id].length > 500) {
    activityStore[event_id] = activityStore[event_id].slice(-500);
  }

  return NextResponse.json({ success: true, item });
}

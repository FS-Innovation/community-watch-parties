import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// GET: Fetch screening receipt(s) for a viewer
export async function GET(request: NextRequest) {
  const viewerId = request.nextUrl.searchParams.get("viewer_id");
  const eventId = request.nextUrl.searchParams.get("event_id");

  if (!viewerId) {
    return NextResponse.json({ error: "viewer_id required" }, { status: 400 });
  }

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      let query = supabase
        .from("screening_receipts")
        .select("*")
        .eq("viewer_id", viewerId)
        .order("created_at", { ascending: false });

      if (eventId) {
        query = query.eq("event_id", eventId);
      }

      const { data } = await query;
      return NextResponse.json({ receipts: data || [] });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ receipts: [] });
}

// POST: Create or update a screening receipt
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    viewer_id, event_id, episode_title, episode_number,
    viewer_count, connection_room, join_time, leave_time,
    watch_duration_seconds, reaction_count, chat_count,
    breakout_duration_seconds, badges_earned, takeaway_text,
  } = body;

  if (!viewer_id || !event_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      const { data } = await supabase
        .from("screening_receipts")
        .upsert({
          viewer_id,
          event_id,
          episode_title,
          episode_number,
          viewer_count,
          connection_room,
          join_time,
          leave_time,
          watch_duration_seconds,
          reaction_count: reaction_count || 0,
          chat_count: chat_count || 0,
          breakout_duration_seconds: breakout_duration_seconds || 0,
          badges_earned: badges_earned || [],
          takeaway_text,
        }, { onConflict: "viewer_id,event_id" })
        .select()
        .single();

      return NextResponse.json({ success: true, receipt: data });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ success: true });
}

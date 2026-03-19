import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// In-memory fallback
const roomsStore: Record<string, Array<{
  id: string;
  event_id: string;
  room_name: string;
  livekit_room_name: string | null;
  max_participants: number;
  current_participants: number;
  tags: string[];
  phase: string;
  is_active: boolean;
  participants: string[];
}>> = {};

// GET: Fetch breakout rooms for an event
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";
  const phase = request.nextUrl.searchParams.get("phase") || "lobby";
  const viewerId = request.nextUrl.searchParams.get("viewer_id");

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      const { data: rooms } = await supabase
        .from("breakout_rooms")
        .select("*")
        .eq("event_id", eventId)
        .eq("phase", phase)
        .eq("is_active", true)
        .order("room_name");

      // If viewer specified, find their room
      let viewerRoom = null;
      if (viewerId && rooms) {
        const { data: participation } = await supabase
          .from("breakout_participants")
          .select("*, room:breakout_rooms(*)")
          .eq("viewer_id", viewerId)
          .is("left_at", null)
          .limit(1);

        if (participation && participation.length > 0) {
          viewerRoom = participation[0];
        }
      }

      return NextResponse.json({ rooms: rooms || [], viewer_room: viewerRoom });
    } catch { /* fall through */ }
  }

  const rooms = (roomsStore[eventId] || []).filter(r => r.phase === phase && r.is_active);
  return NextResponse.json({ rooms, viewer_room: null });
}

// POST: Join, leave, or create rooms
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === "join") {
    const { room_id, viewer_id, display_name } = body;
    if (!room_id || !viewer_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      try {
        const supabase = createServerSupabase();

        // Leave any existing room first
        await supabase
          .from("breakout_participants")
          .update({ left_at: new Date().toISOString() })
          .eq("viewer_id", viewer_id)
          .is("left_at", null);

        // Join new room
        await supabase.from("breakout_participants").insert({
          room_id, viewer_id, display_name,
        });

        // Update participant count
        const { count } = await supabase
          .from("breakout_participants")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room_id)
          .is("left_at", null);

        await supabase
          .from("breakout_rooms")
          .update({ current_participants: count || 0 })
          .eq("id", room_id);

        // Get the room for LiveKit connection info
        const { data: room } = await supabase
          .from("breakout_rooms")
          .select("*")
          .eq("id", room_id)
          .single();

        return NextResponse.json({ success: true, room });
      } catch { /* fall through */ }
    }

    return NextResponse.json({ success: true });
  }

  if (body.action === "leave") {
    const { viewer_id } = body;
    if (isSupabaseConfigured) {
      try {
        const supabase = createServerSupabase();
        await supabase
          .from("breakout_participants")
          .update({ left_at: new Date().toISOString() })
          .eq("viewer_id", viewer_id)
          .is("left_at", null);
        return NextResponse.json({ success: true });
      } catch { /* fall through */ }
    }
    return NextResponse.json({ success: true });
  }

  // Create room (admin)
  const { event_id, room_name, max_participants, tags, phase } = body;
  if (!event_id || !room_name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const room = {
    id: `br-${Date.now()}`,
    event_id,
    room_name,
    livekit_room_name: `breakout-${event_id}-${Date.now()}`,
    max_participants: max_participants || 6,
    current_participants: 0,
    tags: tags || [],
    phase: phase || "lobby",
    is_active: true,
    participants: [],
  };

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      await supabase.from("breakout_rooms").insert(room);
    } catch { /* fall through */ }
  }

  if (!roomsStore[event_id]) roomsStore[event_id] = [];
  roomsStore[event_id].push(room);

  return NextResponse.json({ success: true, room });
}

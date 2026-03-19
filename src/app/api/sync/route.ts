import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { SyncState, HostLayout } from "@/lib/types";

// ─── Fallback in-memory state (used when Supabase isn't configured) ───

interface MemoryRoomState {
  sync: SyncState;
  event_status: string;
  host_layout: HostLayout;
  host_visible: boolean;
  countdown_start: number | null;
  countdown_duration: number;
  curtains_open: boolean;
  playback_id: string | null;
  spotify_playlist_url: string | null;
}

const rooms: Record<string, MemoryRoomState> = {};

function getMemoryRoom(eventId: string): MemoryRoomState {
  if (!rooms[eventId]) {
    rooms[eventId] = {
      sync: { timestamp: 0, state: "paused", rate: 1.0, updated_at: Date.now() },
      event_status: "waiting",
      host_layout: "pip",
      host_visible: false,
      countdown_start: null,
      countdown_duration: 900,
      curtains_open: false,
      playback_id: null,
      spotify_playlist_url: null,
    };
  }
  return rooms[eventId];
}

// ─── Supabase-backed state ───

async function getSupabaseRoom(eventId: string) {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("room_state")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (data) return data;

  // Create default room state
  const defaultState = {
    event_id: eventId,
    sync_timestamp: 0,
    sync_state: "paused",
    sync_rate: 1.0,
    sync_updated_at: Date.now(),
    event_status: "waiting",
    host_layout: "pip",
    host_visible: false,
    countdown_start: null,
    countdown_duration: 900,
    curtains_open: false,
    playback_id: null,
    spotify_playlist_url: null,
  };

  await supabase.from("room_state").upsert(defaultState);
  return defaultState;
}

async function updateSupabaseRoom(eventId: string, updates: Record<string, unknown>) {
  const supabase = createServerSupabase();
  await supabase
    .from("room_state")
    .upsert({ event_id: eventId, ...updates, updated_at: new Date().toISOString() });

  // Broadcast via Supabase Realtime
  try {
    await supabase.channel(`sync:${eventId}`).send({
      type: "broadcast",
      event: "sync_update",
      payload: updates,
    });
  } catch { /* broadcast is best-effort */ }
}

// ─── GET: Fetch current sync state ───

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";

  if (isSupabaseConfigured) {
    try {
      const room = await getSupabaseRoom(eventId);
      return NextResponse.json({
        sync: {
          timestamp: room.sync_timestamp,
          state: room.sync_state,
          rate: room.sync_rate,
          updated_at: room.sync_updated_at,
        },
        event_status: room.event_status,
        host_layout: room.host_layout,
        host_visible: room.host_visible,
        countdown_start: room.countdown_start,
        countdown_duration: room.countdown_duration,
        curtains_open: room.curtains_open,
        playback_id: room.playback_id,
        spotify_playlist_url: room.spotify_playlist_url,
      });
    } catch {
      // Fall through to memory
    }
  }

  const room = getMemoryRoom(eventId);
  return NextResponse.json({
    sync: room.sync,
    event_status: room.event_status,
    host_layout: room.host_layout,
    host_visible: room.host_visible,
    countdown_start: room.countdown_start,
    countdown_duration: room.countdown_duration,
    curtains_open: room.curtains_open,
    playback_id: room.playback_id,
    spotify_playlist_url: room.spotify_playlist_url,
  });
}

// ─── POST: Admin updates playback state ───

export async function POST(request: NextRequest) {
  const body = await request.json();
  const eventId = body.event_id || "demo-event";

  // Build updates object
  const updates: Record<string, unknown> = {};

  if (body.action === "play") {
    updates.sync_timestamp = body.timestamp ?? undefined;
    updates.sync_state = "playing";
    updates.sync_rate = body.rate ?? 1.0;
    updates.sync_updated_at = Date.now();
  } else if (body.action === "pause") {
    updates.sync_timestamp = body.timestamp ?? undefined;
    updates.sync_state = "paused";
    updates.sync_rate = 1.0;
    updates.sync_updated_at = Date.now();
  } else if (body.action === "seek") {
    updates.sync_timestamp = body.timestamp;
    updates.sync_updated_at = Date.now();
  }

  if (body.event_status) {
    updates.event_status = body.event_status;
    if (body.event_status === "countdown") {
      updates.countdown_start = Date.now();
      updates.countdown_duration = body.countdown_duration ?? 300;
    }
    if (body.event_status === "live") {
      updates.countdown_start = null;
      updates.curtains_open = true;
    }
    if (body.event_status === "waiting") {
      updates.curtains_open = false;
      updates.countdown_start = null;
    }
  }

  if (body.countdown_start !== undefined) updates.countdown_start = body.countdown_start;
  if (body.curtains_open !== undefined) updates.curtains_open = body.curtains_open;
  if (body.host_layout) updates.host_layout = body.host_layout;
  if (body.host_visible !== undefined) updates.host_visible = body.host_visible;
  if (body.playback_id !== undefined) updates.playback_id = body.playback_id;
  if (body.spotify_playlist_url !== undefined) updates.spotify_playlist_url = body.spotify_playlist_url;

  if (isSupabaseConfigured) {
    try {
      await updateSupabaseRoom(eventId, updates);
      const room = await getSupabaseRoom(eventId);
      return NextResponse.json({ success: true, ...room });
    } catch {
      // Fall through to memory
    }
  }

  // Memory fallback
  const room = getMemoryRoom(eventId);

  if (body.action === "play") {
    room.sync = {
      timestamp: body.timestamp ?? room.sync.timestamp,
      state: "playing",
      rate: body.rate ?? 1.0,
      updated_at: Date.now(),
    };
  } else if (body.action === "pause") {
    room.sync = {
      timestamp: body.timestamp ?? room.sync.timestamp,
      state: "paused",
      rate: 1.0,
      updated_at: Date.now(),
    };
  } else if (body.action === "seek") {
    room.sync = { ...room.sync, timestamp: body.timestamp, updated_at: Date.now() };
  }

  if (body.event_status) {
    const prevStatus = room.event_status;
    if (body.event_status === "countdown" && prevStatus !== "countdown") {
      room.countdown_start = Date.now();
      room.countdown_duration = body.countdown_duration ?? 300;
    }
    if (body.event_status === "live" && prevStatus !== "live") {
      room.countdown_start = null;
      room.curtains_open = true;
    }
    if (body.event_status === "waiting") {
      room.curtains_open = false;
      room.countdown_start = null;
    }
    room.event_status = body.event_status;
  }

  if (body.countdown_start !== undefined) room.countdown_start = body.countdown_start;
  if (body.curtains_open !== undefined) room.curtains_open = body.curtains_open;
  if (body.host_layout) room.host_layout = body.host_layout;
  if (body.host_visible !== undefined) room.host_visible = body.host_visible;
  if (body.playback_id !== undefined) room.playback_id = body.playback_id;
  if (body.spotify_playlist_url !== undefined) room.spotify_playlist_url = body.spotify_playlist_url;

  return NextResponse.json({ success: true, ...room });
}

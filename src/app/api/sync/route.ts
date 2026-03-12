import { NextRequest, NextResponse } from "next/server";
import type { SyncState, HostLayout } from "@/lib/types";

// ─── In-memory canonical playback state ───
// In production, move this to a Supabase Edge Function or Redis
// so it persists across serverless invocations.

interface RoomState {
  sync: SyncState;
  event_status: string;
  host_layout: HostLayout;
  host_visible: boolean;
  countdown_start: number | null;    // epoch ms when countdown was triggered
  countdown_duration: number;         // countdown duration in seconds (default 300 = 5 min)
}

const rooms: Record<string, RoomState> = {};

function getRoom(eventId: string): RoomState {
  if (!rooms[eventId]) {
    rooms[eventId] = {
      sync: {
        timestamp: 0,
        state: "paused",
        rate: 1.0,
        updated_at: Date.now(),
      },
      event_status: "waiting",
      host_layout: "pip",
      host_visible: true,
      countdown_start: null,
      countdown_duration: 300,
    };
  }
  return rooms[eventId];
}

// GET: Fetch current sync state
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";
  const room = getRoom(eventId);

  return NextResponse.json({
    sync: room.sync,
    event_status: room.event_status,
    host_layout: room.host_layout,
    host_visible: room.host_visible,
    countdown_start: room.countdown_start,
    countdown_duration: room.countdown_duration,
  });
}

// POST: Admin updates playback state (play, pause, seek, status)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const eventId = body.event_id || "demo-event";
  const room = getRoom(eventId);

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
    room.sync = {
      ...room.sync,
      timestamp: body.timestamp,
      updated_at: Date.now(),
    };
  }

  if (body.event_status) {
    room.event_status = body.event_status;
    if (body.event_status === "countdown") {
      room.countdown_start = Date.now();
      room.countdown_duration = body.countdown_duration ?? 300;
    }
    if (body.event_status === "live") {
      room.countdown_start = null;
    }
  }

  if (body.host_layout) {
    room.host_layout = body.host_layout;
  }

  if (body.host_visible !== undefined) {
    room.host_visible = body.host_visible;
  }

  // In production: broadcast this to all clients via Supabase Realtime
  // supabase.channel(`sync:${eventId}`).send({ type: 'broadcast', event: 'sync', payload: room })

  return NextResponse.json({ success: true, ...room });
}

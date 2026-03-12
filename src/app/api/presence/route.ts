import { NextRequest, NextResponse } from "next/server";

// In-memory presence tracking with heartbeat
// In production: use Supabase Realtime Presence
const viewers: Record<string, Record<string, number>> = {};

const HEARTBEAT_TIMEOUT = 30000; // 30 seconds

// POST: Heartbeat from a viewer
export async function POST(request: NextRequest) {
  const { event_id, viewer_id } = await request.json();
  const eventId = event_id || "demo-event";

  if (!viewers[eventId]) viewers[eventId] = {};
  viewers[eventId][viewer_id] = Date.now();

  return NextResponse.json({ success: true });
}

// GET: Count active viewers
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";
  const now = Date.now();

  if (!viewers[eventId]) viewers[eventId] = {};

  // Clean up stale viewers
  for (const [id, lastSeen] of Object.entries(viewers[eventId])) {
    if (now - lastSeen > HEARTBEAT_TIMEOUT) {
      delete viewers[eventId][id];
    }
  }

  const count = Object.keys(viewers[eventId]).length;

  return NextResponse.json({ count });
}

import { NextRequest, NextResponse } from "next/server";

// In-memory presence tracking (replace with Supabase Realtime Presence in production)
const presenceCounts: Record<string, number> = {};

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";

  // Demo: random-ish count
  if (!presenceCounts[eventId]) {
    presenceCounts[eventId] = Math.floor(Math.random() * 800) + 200;
  }
  // Simulate slight fluctuation
  presenceCounts[eventId] += Math.floor(Math.random() * 10) - 4;
  presenceCounts[eventId] = Math.max(1, presenceCounts[eventId]);

  return NextResponse.json({ count: presenceCounts[eventId] });
}

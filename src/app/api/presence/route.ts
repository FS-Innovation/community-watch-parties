import { NextRequest, NextResponse } from "next/server";

// In-memory presence tracking
// In production: use Supabase Realtime Presence
const presenceCounts: Record<string, number> = {};

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";

  // Initialize with a realistic demo count
  if (!presenceCounts[eventId]) {
    presenceCounts[eventId] = Math.floor(Math.random() * 1200) + 400;
  }

  // Simulate natural fluctuation
  presenceCounts[eventId] += Math.floor(Math.random() * 20) - 8;
  presenceCounts[eventId] = Math.max(100, presenceCounts[eventId]);

  return NextResponse.json({ count: presenceCounts[eventId] });
}

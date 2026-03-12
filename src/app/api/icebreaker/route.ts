import { NextRequest, NextResponse } from "next/server";

// In-memory store for icebreaker responses
// Production: use Supabase table
interface ViewerProfile {
  viewer_id: string;
  display_name: string;
  responses: { prompt: string; answer: string }[];
  event_id: string;
  submitted_at: number;
}

const profiles: Record<string, Record<string, ViewerProfile>> = {}; // eventId -> viewerId -> profile

// POST: Submit an icebreaker answer
export async function POST(request: NextRequest) {
  const { event_id, viewer_id, display_name, prompt, answer } = await request.json();

  if (!event_id || !viewer_id || !prompt || !answer) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!profiles[event_id]) profiles[event_id] = {};

  if (!profiles[event_id][viewer_id]) {
    profiles[event_id][viewer_id] = {
      viewer_id,
      display_name,
      responses: [],
      event_id,
      submitted_at: Date.now(),
    };
  }

  profiles[event_id][viewer_id].display_name = display_name;
  profiles[event_id][viewer_id].responses.push({ prompt, answer });
  profiles[event_id][viewer_id].submitted_at = Date.now();

  return NextResponse.json({ success: true });
}

// GET: Get all profiles for an event (used by matchmaking)
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";
  const viewerProfiles = profiles[eventId] ? Object.values(profiles[eventId]) : [];
  return NextResponse.json({ profiles: viewerProfiles });
}

import { NextRequest, NextResponse } from "next/server";

// In-memory chat store (production: use Supabase Realtime or Redis)
const chatMessages: Record<string, Array<{
  id: string;
  viewer_id: string;
  display_name: string;
  text: string;
  timestamp: number;
}>> = {};

// GET: Fetch messages for an event
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";
  const messages = chatMessages[eventId] || [];
  // Return last 100 messages
  return NextResponse.json({ messages: messages.slice(-100) });
}

// POST: Send a message
export async function POST(request: NextRequest) {
  const { event_id, id, viewer_id, display_name, text, timestamp } = await request.json();

  if (!event_id || !viewer_id || !display_name || !text) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!chatMessages[event_id]) {
    chatMessages[event_id] = [];
  }

  chatMessages[event_id].push({ id, viewer_id, display_name, text, timestamp });

  // Keep only last 200 messages per event
  if (chatMessages[event_id].length > 200) {
    chatMessages[event_id] = chatMessages[event_id].slice(-200);
  }

  return NextResponse.json({ success: true });
}

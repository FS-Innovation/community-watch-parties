import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

// GET: Fetch the active card for the current playback time
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";
  const currentTime = parseInt(request.nextUrl.searchParams.get("current_time") || "0");

  if (!isSupabaseConfigured) {
    // Demo cards at specific timestamps
    const demoCards = [
      {
        id: "demo-card-1",
        event_id: "demo-event",
        type: "card",
        trigger_time_seconds: 30,
        prompt_text: "What moment in this episode resonated with you most so far?",
        options: null,
        response_type: "text",
        auto_dismiss_seconds: 30,
        show_results: false,
        is_active: true,
        sort_order: 0,
      },
      {
        id: "demo-quiz-1",
        event_id: "demo-event",
        type: "quiz",
        trigger_time_seconds: 120,
        prompt_text: "Which DOAC episode had the most downloads in 2025?",
        options: ["The Simon Sinek Episode", "The Diary CEO Special", "The AI Revolution", "The Health Episode"],
        response_type: "multiple_choice",
        auto_dismiss_seconds: 20,
        show_results: true,
        is_active: true,
        sort_order: 1,
      },
      {
        id: "demo-poll-1",
        event_id: "demo-event",
        type: "poll",
        trigger_time_seconds: 300,
        prompt_text: "React to this moment:",
        options: null,
        response_type: "emoji_choice",
        auto_dismiss_seconds: 15,
        show_results: false,
        is_active: true,
        sort_order: 2,
      },
    ];

    // Find a card within a 10-second window of current time
    const card = demoCards.find(
      (c) => currentTime >= c.trigger_time_seconds && currentTime < c.trigger_time_seconds + 10
    );

    return NextResponse.json({ card: card || null });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  // Find card whose trigger time is within a 10-second window
  const { data: cards } = await supabase
    .from("conversation_cards")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_active", true)
    .gte("trigger_time_seconds", currentTime - 5)
    .lte("trigger_time_seconds", currentTime + 5)
    .order("sort_order", { ascending: true })
    .limit(1);

  return NextResponse.json({ card: cards?.[0] || null });
}

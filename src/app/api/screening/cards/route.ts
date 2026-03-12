import { NextRequest, NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id");

  if (!hasSupabase || !eventId) {
    // Demo: occasionally return a card
    if (Math.random() < 0.1) {
      return NextResponse.json({
        card: {
          id: "demo-card",
          event_id: "demo-event",
          trigger_time_seconds: 300,
          prompt_text: "What moment in this episode resonated with you most?",
          response_type: "text",
          choices: null,
          is_active: true,
        },
      });
    }
    return NextResponse.json({ card: null });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  // Get active cards for this event
  const { data: cards } = await supabase
    .from("conversation_cards")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_active", true)
    .order("trigger_time_seconds", { ascending: true })
    .limit(1);

  return NextResponse.json({ card: cards?.[0] || null });
}

import { NextRequest, NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id");

  if (!hasSupabase || !eventId) {
    return NextResponse.json({
      leaderboard: [
        { first_name: "Maya", score: 142 },
        { first_name: "James", score: 128 },
        { first_name: "Ade", score: 115 },
        { first_name: "Sophie", score: 98 },
        { first_name: "Ravi", score: 87 },
      ],
    });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("event_engagement")
    .select("engagement_score, registration_id, registrations(first_name)")
    .eq("event_id", eventId)
    .order("engagement_score", { ascending: false })
    .limit(10);

  const leaderboard = (data || []).map((row) => ({
    first_name: (row as Record<string, unknown>).registrations
      ? ((row as Record<string, unknown>).registrations as { first_name: string }).first_name
      : "Anonymous",
    score: row.engagement_score,
  }));

  return NextResponse.json({ leaderboard });
}

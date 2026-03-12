import { NextRequest, NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function POST(request: NextRequest) {
  const { token, emoji } = await request.json();

  if (!token || !emoji) {
    return NextResponse.json({ error: "Token and emoji required" }, { status: 400 });
  }

  if (!hasSupabase) {
    return NextResponse.json({ success: true });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  // Look up registration
  const { data: reg } = await supabase
    .from("registrations")
    .select("id, event_id")
    .eq("access_token", token)
    .single();

  if (!reg) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Upsert engagement row
  const { data: existing } = await supabase
    .from("event_engagement")
    .select("id, reactions_count, engagement_score")
    .eq("registration_id", reg.id)
    .eq("event_id", reg.event_id)
    .single();

  if (existing) {
    await supabase
      .from("event_engagement")
      .update({
        reactions_count: existing.reactions_count + 1,
        engagement_score: existing.engagement_score + 1,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("event_engagement").insert({
      registration_id: reg.id,
      event_id: reg.event_id,
      reactions_count: 1,
      engagement_score: 1,
    });
  }

  // Broadcast via Supabase Realtime (in production)
  // supabase.channel(`reactions:${reg.event_id}`).send({ type: 'broadcast', event: 'reaction', payload: { emoji } });

  return NextResponse.json({ success: true });
}

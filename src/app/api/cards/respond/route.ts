import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { card_id, event_id, viewer_id, response_value } = await request.json();

  if (!card_id || !viewer_id || !response_value) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ success: true });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  await supabase.from("card_responses").insert({
    card_id,
    event_id,
    viewer_id,
    response_value,
  });

  return NextResponse.json({ success: true });
}

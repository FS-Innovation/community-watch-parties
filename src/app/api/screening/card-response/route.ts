import { NextRequest, NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function POST(request: NextRequest) {
  const { token, card_id, response } = await request.json();

  if (!token || !card_id || !response) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!hasSupabase) {
    return NextResponse.json({ success: true });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data: reg } = await supabase
    .from("registrations")
    .select("id")
    .eq("access_token", token)
    .single();

  if (!reg) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  // Store response
  const isEmoji = response.length <= 2;
  await supabase.from("card_responses").insert({
    card_id,
    registration_id: reg.id,
    response_text: isEmoji ? null : response,
    response_emoji: isEmoji ? response : null,
  });

  return NextResponse.json({ success: true });
}

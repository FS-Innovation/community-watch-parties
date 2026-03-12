import { NextRequest, NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function POST(request: NextRequest) {
  const { token, reflection } = await request.json();

  if (!token || !reflection) {
    return NextResponse.json({ error: "Token and reflection required" }, { status: 400 });
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

  // Store reflection as a signal response
  await supabase.from("signal_responses").insert({
    registration_id: reg.id,
    question_key: "post_watch_reflection",
    answer_text: reflection,
  });

  return NextResponse.json({ success: true });
}

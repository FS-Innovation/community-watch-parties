import { NextRequest, NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function POST(request: NextRequest) {
  const { token, question_id } = await request.json();

  if (!token || !question_id) {
    return NextResponse.json({ error: "Token and question_id required" }, { status: 400 });
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

  // Check if already upvoted
  const { data: existing } = await supabase
    .from("question_upvotes")
    .select("id")
    .eq("question_id", question_id)
    .eq("registration_id", reg.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already upvoted" }, { status: 409 });
  }

  // Insert upvote and increment count
  await supabase.from("question_upvotes").insert({
    question_id,
    registration_id: reg.id,
  });

  // Increment upvote count
  const { data: q } = await supabase.from("questions").select("upvotes").eq("id", question_id).single();
  if (q) {
    await supabase.from("questions").update({ upvotes: q.upvotes + 1 }).eq("id", question_id);
  }

  return NextResponse.json({ success: true });
}

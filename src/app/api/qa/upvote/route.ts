import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { question_id, viewer_id } = await request.json();

  if (!question_id || !viewer_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ success: true });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  // Check if already voted
  const { data: existing } = await supabase
    .from("qa_upvotes")
    .select("id")
    .eq("question_id", question_id)
    .eq("viewer_id", viewer_id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already upvoted" }, { status: 409 });
  }

  // Insert upvote
  await supabase.from("qa_upvotes").insert({ question_id, viewer_id });

  // Increment count
  const { data: q } = await supabase
    .from("qa_questions")
    .select("upvote_count")
    .eq("id", question_id)
    .single();

  if (q) {
    await supabase
      .from("qa_questions")
      .update({ upvote_count: q.upvote_count + 1 })
      .eq("id", question_id);
  }

  return NextResponse.json({ success: true });
}

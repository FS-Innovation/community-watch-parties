import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

// GET: List questions for an event
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id");

  if (!isSupabaseConfigured || !eventId) {
    return NextResponse.json({
      questions: [
        { id: "q1", event_id: "demo-event", viewer_id: "v1", display_name: "Maya", question_text: "What was the hardest lesson you learned building your first business?", upvote_count: 31, status: "visible", created_at: new Date().toISOString() },
        { id: "q2", event_id: "demo-event", viewer_id: "v2", display_name: "James", question_text: "How do you decide when to pivot vs persist?", upvote_count: 24, status: "visible", created_at: new Date().toISOString() },
        { id: "q3", event_id: "demo-event", viewer_id: "v3", display_name: "Sophie", question_text: "What role has failure played in your success?", upvote_count: 18, status: "visible", created_at: new Date().toISOString() },
      ],
    });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data: questions } = await supabase
    .from("qa_questions")
    .select("*")
    .eq("event_id", eventId)
    .in("status", ["visible", "selected", "answered"])
    .order("upvote_count", { ascending: false })
    .limit(100);

  return NextResponse.json({ questions: questions || [] });
}

// POST: Submit a question
export async function POST(request: NextRequest) {
  const { event_id, viewer_id, display_name, question_text } = await request.json();

  if (!event_id || !viewer_id || !display_name || !question_text) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ success: true });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  // Rate limit: check last submission time for this viewer
  const { data: recent } = await supabase
    .from("qa_questions")
    .select("created_at")
    .eq("viewer_id", viewer_id)
    .eq("event_id", event_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (recent) {
    const lastTime = new Date(recent.created_at).getTime();
    if (Date.now() - lastTime < 60000) {
      return NextResponse.json({ error: "Please wait before submitting another question" }, { status: 429 });
    }
  }

  await supabase.from("qa_questions").insert({
    event_id,
    viewer_id,
    display_name,
    question_text,
  });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// In-memory fallback
const questionsStore: Record<string, Array<{
  id: string;
  event_id: string;
  viewer_id: string;
  display_name: string;
  question_text: string;
  source: string;
  is_featured: boolean;
  is_answered: boolean;
  upvotes: number;
  created_at: string;
}>> = {};

const upvotesStore: Record<string, Set<string>> = {};

// GET: Fetch questions for an event
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";
  const featured = request.nextUrl.searchParams.get("featured");

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      let query = supabase
        .from("viewer_questions")
        .select("*")
        .eq("event_id", eventId)
        .order("upvotes", { ascending: false });

      if (featured === "true") {
        query = query.eq("is_featured", true);
      }

      const { data } = await query;
      return NextResponse.json({ questions: data || [] });
    } catch { /* fall through */ }
  }

  const questions = (questionsStore[eventId] || [])
    .filter(q => featured !== "true" || q.is_featured)
    .sort((a, b) => b.upvotes - a.upvotes);
  return NextResponse.json({ questions });
}

// POST: Submit or upvote a question
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  if (action === "upvote") {
    const { question_id, viewer_id } = body;
    const key = `${question_id}:${viewer_id}`;

    if (isSupabaseConfigured) {
      try {
        const supabase = createServerSupabase();
        await supabase.from("question_upvotes").insert({ question_id, viewer_id });
        await supabase.rpc("increment_question_upvotes", { q_id: question_id });
        return NextResponse.json({ success: true });
      } catch { /* fall through */ }
    }

    if (!upvotesStore[key]) {
      upvotesStore[key] = new Set();
      // Find and increment
      for (const questions of Object.values(questionsStore)) {
        const q = questions.find(q => q.id === question_id);
        if (q) { q.upvotes++; break; }
      }
    }
    return NextResponse.json({ success: true });
  }

  if (action === "feature") {
    const { question_id, is_featured } = body;
    if (isSupabaseConfigured) {
      try {
        const supabase = createServerSupabase();
        await supabase
          .from("viewer_questions")
          .update({ is_featured })
          .eq("id", question_id);
        return NextResponse.json({ success: true });
      } catch { /* fall through */ }
    }
    return NextResponse.json({ success: true });
  }

  if (action === "answer") {
    const { question_id } = body;
    if (isSupabaseConfigured) {
      try {
        const supabase = createServerSupabase();
        await supabase
          .from("viewer_questions")
          .update({ is_answered: true })
          .eq("id", question_id);
        return NextResponse.json({ success: true });
      } catch { /* fall through */ }
    }
    return NextResponse.json({ success: true });
  }

  // Default: submit new question
  const { event_id, viewer_id, display_name, question_text, source } = body;
  if (!event_id || !viewer_id || !question_text) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const question = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    event_id,
    viewer_id,
    display_name: display_name || "Anonymous",
    question_text,
    source: source || "live",
    is_featured: false,
    is_answered: false,
    upvotes: 0,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      await supabase.from("viewer_questions").insert(question);
    } catch { /* fall through */ }
  }

  if (!questionsStore[event_id]) questionsStore[event_id] = [];
  questionsStore[event_id].push(question);

  return NextResponse.json({ success: true, question });
}

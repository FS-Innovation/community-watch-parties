import { NextRequest, NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

// GET: List questions for an event
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id");

  if (!hasSupabase || !eventId) {
    return NextResponse.json({
      questions: [
        { id: "demo-q1", question: "What was the hardest lesson you learned building your first business?", upvotes: 24, is_answered: false },
        { id: "demo-q2", question: "How do you decide when to pivot vs persist?", upvotes: 18, is_answered: false },
      ],
    });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("event_id", eventId)
    .order("upvotes", { ascending: false })
    .limit(50);

  return NextResponse.json({ questions: questions || [] });
}

// POST: Submit a question
export async function POST(request: NextRequest) {
  const { token, question } = await request.json();

  if (!token || !question) {
    return NextResponse.json({ error: "Token and question required" }, { status: 400 });
  }

  if (!hasSupabase) {
    return NextResponse.json({ success: true });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, event_id")
    .eq("access_token", token)
    .single();

  if (!reg) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  await supabase.from("questions").insert({
    event_id: reg.event_id,
    registration_id: reg.id,
    question,
  });

  return NextResponse.json({ success: true });
}

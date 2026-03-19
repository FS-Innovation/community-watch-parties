import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// In-memory fallback
const promptsStore: Record<string, Array<{
  id: string;
  event_id: string;
  trigger_time_seconds: number;
  prompt_text: string;
  emoji_options: string[];
  duration_seconds: number;
  is_active: boolean;
}>> = {};

const promptResponsesStore: Record<string, Array<{
  prompt_id: string;
  viewer_id: string;
  emoji: string;
}>> = {};

// GET: Fetch prompts for current time, or all prompts
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";
  const currentTime = parseInt(request.nextUrl.searchParams.get("current_time") || "0");
  const all = request.nextUrl.searchParams.get("all") === "true";

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();

      if (all) {
        const { data } = await supabase
          .from("reaction_prompts")
          .select("*")
          .eq("event_id", eventId)
          .eq("is_active", true)
          .order("trigger_time_seconds");
        return NextResponse.json({ prompts: data || [] });
      }

      // Find prompt active at current time
      const { data } = await supabase
        .from("reaction_prompts")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .lte("trigger_time_seconds", currentTime)
        .gt("trigger_time_seconds", currentTime - 30) // within 30s window
        .order("trigger_time_seconds", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const prompt = data[0];
        // Check if within duration
        if (currentTime <= prompt.trigger_time_seconds + prompt.duration_seconds) {
          // Get response counts
          const { data: responses } = await supabase
            .from("reaction_prompt_responses")
            .select("emoji")
            .eq("prompt_id", prompt.id);

          const counts: Record<string, number> = {};
          for (const r of (responses || [])) {
            counts[r.emoji] = (counts[r.emoji] || 0) + 1;
          }

          return NextResponse.json({ prompt: { ...prompt, counts } });
        }
      }

      return NextResponse.json({ prompt: null });
    } catch { /* fall through */ }
  }

  const prompts = (promptsStore[eventId] || []).filter(p => p.is_active);
  if (all) return NextResponse.json({ prompts });

  const active = prompts.find(p =>
    currentTime >= p.trigger_time_seconds &&
    currentTime <= p.trigger_time_seconds + p.duration_seconds
  );

  if (active) {
    const responses = promptResponsesStore[active.id] || [];
    const counts: Record<string, number> = {};
    for (const r of responses) {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    }
    return NextResponse.json({ prompt: { ...active, counts } });
  }

  return NextResponse.json({ prompt: null });
}

// POST: Respond to a prompt, or create a prompt (admin)
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === "respond") {
    const { prompt_id, event_id, viewer_id, emoji } = body;
    if (!prompt_id || !viewer_id || !emoji) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      try {
        const supabase = createServerSupabase();
        await supabase.from("reaction_prompt_responses").insert({
          prompt_id, event_id, viewer_id, emoji,
        });
      } catch { /* fall through */ }
    }

    if (!promptResponsesStore[prompt_id]) promptResponsesStore[prompt_id] = [];
    promptResponsesStore[prompt_id].push({ prompt_id, viewer_id, emoji });

    return NextResponse.json({ success: true });
  }

  // Create new prompt (admin)
  const { event_id, trigger_time_seconds, prompt_text, emoji_options, duration_seconds } = body;
  const prompt = {
    id: `rp-${Date.now()}`,
    event_id,
    trigger_time_seconds,
    prompt_text: prompt_text || "Did this resonate?",
    emoji_options: emoji_options || ["🔥", "❤️", "🤯", "😂", "👏"],
    duration_seconds: duration_seconds || 15,
    is_active: true,
  };

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      await supabase.from("reaction_prompts").insert(prompt);
    } catch { /* fall through */ }
  }

  if (!promptsStore[event_id]) promptsStore[event_id] = [];
  promptsStore[event_id].push(prompt);

  return NextResponse.json({ success: true, prompt });
}

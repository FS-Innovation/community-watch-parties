import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// In-memory fallback
const responsesStore: Record<string, Array<{
  id: string;
  viewer_id: string;
  response_text: string;
  created_at: string;
}>> = {};

// GET: Fetch word cloud data
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      const { data } = await supabase
        .from("word_cloud_responses")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      const responses = data || [];

      // Build word frequency map
      const wordMap = buildWordMap(responses.map(r => r.response_text));

      return NextResponse.json({ responses, words: wordMap });
    } catch { /* fall through */ }
  }

  const responses = responsesStore[eventId] || [];
  const wordMap = buildWordMap(responses.map(r => r.response_text));
  return NextResponse.json({ responses, words: wordMap });
}

// POST: Submit a takeaway
export async function POST(request: NextRequest) {
  const { event_id, viewer_id, response_text } = await request.json();

  if (!event_id || !viewer_id || !response_text) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const response = {
    id: `wc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    event_id,
    viewer_id,
    response_text: response_text.trim(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      await supabase.from("word_cloud_responses").insert(response);
    } catch { /* fall through */ }
  }

  if (!responsesStore[event_id]) responsesStore[event_id] = [];
  responsesStore[event_id].push(response);

  return NextResponse.json({ success: true });
}

function buildWordMap(texts: string[]): Array<{ word: string; count: number }> {
  const stopWords = new Set([
    "the", "a", "an", "is", "was", "are", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "above", "below", "between", "out", "off", "over",
    "under", "again", "further", "then", "once", "and", "but", "or",
    "nor", "not", "so", "yet", "both", "either", "neither", "each",
    "every", "all", "any", "few", "more", "most", "other", "some",
    "such", "no", "only", "own", "same", "than", "too", "very",
    "just", "because", "if", "when", "where", "how", "what", "which",
    "who", "whom", "this", "that", "these", "those", "i", "me", "my",
    "we", "our", "you", "your", "he", "him", "his", "she", "her",
    "it", "its", "they", "them", "their", "about", "up",
  ]);

  const freq: Record<string, number> = {};
  for (const text of texts) {
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && !stopWords.has(word)) {
        freq[word] = (freq[word] || 0) + 1;
      }
    }
  }

  return Object.entries(freq)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
}

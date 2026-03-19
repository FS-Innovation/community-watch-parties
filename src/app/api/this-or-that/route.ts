import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// In-memory fallback
const gamesStore: Record<string, Array<{
  id: string;
  event_id: string;
  option_a: string;
  option_b: string;
  phase: string;
  is_active: boolean;
  sort_order: number;
  votes_a: number;
  votes_b: number;
}>> = {};

const votesStore: Record<string, string> = {}; // `gameId:viewerId` -> choice

// GET: Fetch games + results
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";
  const phase = request.nextUrl.searchParams.get("phase") || "lobby";

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      const { data: games } = await supabase
        .from("this_or_that")
        .select("*")
        .eq("event_id", eventId)
        .eq("phase", phase)
        .eq("is_active", true)
        .order("sort_order");

      if (!games || games.length === 0) {
        return NextResponse.json({ games: [] });
      }

      // Get vote counts
      const gameIds = games.map(g => g.id);
      const { data: votes } = await supabase
        .from("this_or_that_votes")
        .select("game_id, choice")
        .in("game_id", gameIds);

      const voteCounts: Record<string, { a: number; b: number }> = {};
      for (const g of games) {
        voteCounts[g.id] = { a: 0, b: 0 };
      }
      for (const v of (votes || [])) {
        if (voteCounts[v.game_id]) {
          voteCounts[v.game_id][v.choice as 'a' | 'b']++;
        }
      }

      const enriched = games.map(g => ({
        ...g,
        votes_a: voteCounts[g.id]?.a || 0,
        votes_b: voteCounts[g.id]?.b || 0,
      }));

      return NextResponse.json({ games: enriched });
    } catch { /* fall through */ }
  }

  const games = (gamesStore[eventId] || []).filter(g => g.phase === phase && g.is_active);
  return NextResponse.json({ games });
}

// POST: Vote or create game
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === "vote") {
    const { game_id, event_id, viewer_id, choice } = body;
    if (!game_id || !viewer_id || !choice) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const key = `${game_id}:${viewer_id}`;
    if (votesStore[key]) {
      return NextResponse.json({ error: "Already voted" }, { status: 409 });
    }

    if (isSupabaseConfigured) {
      try {
        const supabase = createServerSupabase();
        await supabase.from("this_or_that_votes").insert({
          game_id, event_id, viewer_id, choice,
        });
      } catch { /* fall through */ }
    }

    votesStore[key] = choice;
    const games = gamesStore[event_id] || [];
    const game = games.find(g => g.id === game_id);
    if (game) {
      if (choice === "a") game.votes_a++;
      else game.votes_b++;
    }

    return NextResponse.json({ success: true });
  }

  // Create new game (admin)
  const { event_id, option_a, option_b, phase } = body;
  if (!event_id || !option_a || !option_b) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const game = {
    id: `tot-${Date.now()}`,
    event_id,
    option_a,
    option_b,
    phase: phase || "lobby",
    is_active: true,
    sort_order: 0,
    votes_a: 0,
    votes_b: 0,
  };

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      await supabase.from("this_or_that").insert(game);
    } catch { /* fall through */ }
  }

  if (!gamesStore[event_id]) gamesStore[event_id] = [];
  gamesStore[event_id].push(game);

  return NextResponse.json({ success: true, game });
}

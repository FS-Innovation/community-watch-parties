import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// GET: Fetch all badges or viewer's badges
export async function GET(request: NextRequest) {
  const viewerId = request.nextUrl.searchParams.get("viewer_id");

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();

      if (viewerId) {
        const { data } = await supabase
          .from("viewer_badges")
          .select("*, badge:badges(*)")
          .eq("viewer_id", viewerId)
          .order("earned_at", { ascending: false });
        return NextResponse.json({ badges: data || [] });
      }

      const { data } = await supabase
        .from("badges")
        .select("*")
        .order("category");
      return NextResponse.json({ badges: data || [] });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ badges: [] });
}

// POST: Award a badge to a viewer
export async function POST(request: NextRequest) {
  const { viewer_id, badge_slug, event_id } = await request.json();

  if (!viewer_id || !badge_slug) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();

      // Look up badge by slug
      const { data: badge } = await supabase
        .from("badges")
        .select("id")
        .eq("slug", badge_slug)
        .single();

      if (!badge) {
        return NextResponse.json({ error: "Badge not found" }, { status: 404 });
      }

      // Award badge (ignore conflict = already earned)
      await supabase
        .from("viewer_badges")
        .upsert({
          viewer_id,
          badge_id: badge.id,
          event_id: event_id || null,
        }, { onConflict: "viewer_id,badge_id,event_id" });

      return NextResponse.json({ success: true });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// GET: Fetch viewer profile + badges + receipts
export async function GET(request: NextRequest) {
  const viewerId = request.nextUrl.searchParams.get("viewer_id");
  if (!viewerId) {
    return NextResponse.json({ error: "viewer_id required" }, { status: 400 });
  }

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();

      // Fetch profile
      const { data: profile } = await supabase
        .from("viewer_profiles")
        .select("*")
        .eq("viewer_id", viewerId)
        .single();

      // Fetch badges with badge details
      const { data: viewerBadges } = await supabase
        .from("viewer_badges")
        .select("*, badge:badges(*)")
        .eq("viewer_id", viewerId)
        .order("earned_at", { ascending: false });

      // Fetch screening receipts
      const { data: receipts } = await supabase
        .from("screening_receipts")
        .select("*")
        .eq("viewer_id", viewerId)
        .order("created_at", { ascending: false });

      return NextResponse.json({
        profile: profile || null,
        badges: viewerBadges || [],
        receipts: receipts || [],
      });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ profile: null, badges: [], receipts: [] });
}

// POST: Create or update profile
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { viewer_id, display_name, email, location, avatar_url, registration_answers } = body;

  if (!viewer_id) {
    return NextResponse.json({ error: "viewer_id required" }, { status: 400 });
  }

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      const { data } = await supabase
        .from("viewer_profiles")
        .upsert({
          viewer_id,
          display_name,
          email,
          location,
          avatar_url,
          registration_answers,
          updated_at: new Date().toISOString(),
        }, { onConflict: "viewer_id" })
        .select()
        .single();

      return NextResponse.json({ success: true, profile: data });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ success: true, profile: { viewer_id, display_name } });
}

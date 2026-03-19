import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// POST: Track engagement event (silent, fire-and-forget)
export async function POST(request: NextRequest) {
  const { event_id, viewer_id, metric_type, metric_value, video_timestamp } = await request.json();

  if (!event_id || !viewer_id || !metric_type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();
      await supabase.from("engagement_tracking").insert({
        event_id,
        viewer_id,
        metric_type,
        metric_value: metric_value || null,
        video_timestamp: video_timestamp || null,
      });
    } catch { /* silent tracking, best effort */ }
  }

  return NextResponse.json({ success: true });
}

// GET: Fetch engagement summary (admin/analytics)
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerSupabase();

      // Get counts by metric type
      const { data } = await supabase
        .from("engagement_tracking")
        .select("metric_type")
        .eq("event_id", eventId);

      const counts: Record<string, number> = {};
      for (const row of (data || [])) {
        counts[row.metric_type] = (counts[row.metric_type] || 0) + 1;
      }

      // Get unique viewers
      const { count: uniqueViewers } = await supabase
        .from("engagement_tracking")
        .select("viewer_id", { count: "exact", head: true })
        .eq("event_id", eventId);

      return NextResponse.json({ counts, unique_viewers: uniqueViewers || 0 });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ counts: {}, unique_viewers: 0 });
}

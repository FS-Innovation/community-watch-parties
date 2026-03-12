import { NextRequest, NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

// GET: Get active event info
export async function GET() {
  if (!hasSupabase) {
    return NextResponse.json({
      event: {
        id: "demo-event",
        title: "BTD Exclusive Screening",
        status: "registration",
        threshold: 1000,
        screening_date: null,
        registered: 347,
      },
    });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .in("status", ["registration", "confirmed", "live"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!event) {
    return NextResponse.json({ event: null });
  }

  const { count } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id);

  return NextResponse.json({
    event: { ...event, registered: count || 0 },
  });
}

// POST: Create or update event (admin only)
export async function POST(request: NextRequest) {
  if (!hasSupabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  if (body.id) {
    const { data, error } = await supabase
      .from("events")
      .update({
        title: body.title,
        status: body.status,
        screening_date: body.screening_date,
        mux_playback_id: body.mux_playback_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: data });
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: body.title || "BTD Exclusive Screening",
      status: body.status || "registration",
      threshold: body.threshold || 1000,
      screening_date: body.screening_date || null,
      mux_playback_id: body.mux_playback_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

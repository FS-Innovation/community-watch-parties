import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({
      event: {
        id: "demo-event",
        title: "FlightStory Community Screening",
        mux_playback_id: process.env.NEXT_PUBLIC_MUX_PLAYBACK_ID || null,
        status: "live",
        created_at: new Date().toISOString(),
      },
    });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ event: event || null });
}

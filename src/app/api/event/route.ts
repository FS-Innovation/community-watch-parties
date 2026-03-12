import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({
      event: {
        id: "demo-event",
        title: "BTD Exclusive Screening",
        mux_playback_id: null,
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

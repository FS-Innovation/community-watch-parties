import { NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function GET() {
  if (!hasSupabase) {
    return NextResponse.json({
      rooms: [
        { id: "r1", name: "The Reflection Room", screen_label: "reflection-room", current_count: 34, min_threshold: 20, status: "open" },
        { id: "r2", name: "Founder's Den", screen_label: "founders-den", current_count: 12, min_threshold: 20, status: "filling" },
        { id: "r3", name: "Creative Studio", screen_label: "creative-studio", current_count: 22, min_threshold: 20, status: "open" },
        { id: "r4", name: "Locals: London", screen_label: "locals-london", current_count: 8, min_threshold: 20, status: "filling" },
      ],
    });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("rooms")
    .select("id, name, screen_label, current_count, min_threshold, status")
    .order("current_count", { ascending: false });

  return NextResponse.json({ rooms: data || [] });
}

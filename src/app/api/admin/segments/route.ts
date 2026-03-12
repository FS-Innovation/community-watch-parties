import { NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function GET() {
  if (!hasSupabase) {
    return NextResponse.json({
      segments: [
        { segment: "meaning-seeker", count: 124 },
        { segment: "builder", count: 98 },
        { segment: "creative", count: 76 },
        { segment: "connector", count: 49 },
      ],
    });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  // Group by primary_segment
  const { data } = await supabase
    .from("segments")
    .select("primary_segment");

  const counts: Record<string, number> = {};
  (data || []).forEach((row) => {
    const seg = row.primary_segment || "unknown";
    counts[seg] = (counts[seg] || 0) + 1;
  });

  const segments = Object.entries(counts).map(([segment, count]) => ({ segment, count }));
  segments.sort((a, b) => b.count - a.count);

  return NextResponse.json({ segments });
}

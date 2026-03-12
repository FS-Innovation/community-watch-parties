import { NextRequest, NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Demo mode
  if (!hasSupabase || token.startsWith("demo-")) {
    return NextResponse.json({
      matches: [
        { id: "m1", first_name: "Alex", match_reason: "Both interested in AI and building in public", status: "pending" },
        { id: "m2", first_name: "Sara", match_reason: "Similar creative background and London-based", status: "pending" },
        { id: "m3", first_name: "Tom", match_reason: "Both founders navigating early-stage growth", status: "pending" },
      ],
    });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data: reg } = await supabase
    .from("registrations")
    .select("id")
    .eq("access_token", token)
    .single();

  if (!reg) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  // Get match recommendations
  const { data: matches } = await supabase
    .from("match_recommendations")
    .select(`
      id,
      match_reason,
      status,
      user_b_id,
      registrations!match_recommendations_user_b_id_fkey(first_name)
    `)
    .eq("user_a_id", reg.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const formatted = (matches || []).map((m) => ({
    id: m.id,
    first_name: (m as Record<string, unknown>).registrations
      ? ((m as Record<string, unknown>).registrations as { first_name: string }).first_name
      : "Someone",
    match_reason: m.match_reason,
    status: m.status,
  }));

  return NextResponse.json({ matches: formatted });
}

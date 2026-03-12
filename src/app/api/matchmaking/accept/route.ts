import { NextRequest, NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function POST(request: NextRequest) {
  const { token, match_id, contact_method } = await request.json();

  if (!token || !match_id) {
    return NextResponse.json({ error: "Token and match_id required" }, { status: 400 });
  }

  if (!hasSupabase) {
    return NextResponse.json({ success: true });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data: reg } = await supabase
    .from("registrations")
    .select("id")
    .eq("access_token", token)
    .single();

  if (!reg) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  // Update match status
  await supabase
    .from("match_recommendations")
    .update({ status: "accepted" })
    .eq("id", match_id)
    .eq("user_a_id", reg.id);

  // In production: notify user_b, share contact details based on contact_method
  console.log(`Match ${match_id} accepted via ${contact_method}`);

  return NextResponse.json({ success: true });
}

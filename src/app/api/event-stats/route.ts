import { NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function GET() {
  if (!hasSupabase) {
    return NextResponse.json({ registered: 73, capacity: 100 });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { count } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({ registered: count ?? 0, capacity: 100 });
}

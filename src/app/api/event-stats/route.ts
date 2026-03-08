import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = createServerSupabase();

  const { count } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({ registered: count ?? 0, capacity: 100 });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("registrations")
    .select("id, name, email")
    .eq("access_token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invalid access token" }, { status: 401 });
  }

  return NextResponse.json({ user: data });
}

import { NextRequest, NextResponse } from "next/server";

// In-memory show status (in production, use Redis or database)
let showLive = false;

export async function GET() {
  return NextResponse.json({ showLive });
}

export async function POST(request: NextRequest) {
  const { action, token } = await request.json();

  // Verify the user is a host
  const hasSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

  if (hasSupabase) {
    const { createServerSupabase } = await import("@/lib/supabase");
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from("registrations")
      .select("role")
      .eq("access_token", token)
      .single();

    if (!data || data.role !== "host") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }
  // Demo mode: allow all

  if (action === "start") {
    showLive = true;
  } else if (action === "stop") {
    showLive = false;
  }

  return NextResponse.json({ showLive });
}

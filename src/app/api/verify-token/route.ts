import { NextRequest, NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Demo mode
  if (!hasSupabase || token.startsWith("demo-")) {
    return NextResponse.json({
      user: {
        id: "demo-user",
        first_name: "Demo",
        email: "demo@example.com",
        seat_code: "G-15",
        ticket_number: 42,
        role: "host",
        event_id: "demo-event",
      },
    });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data: registration, error } = await supabase
    .from("registrations")
    .select("id, first_name, email, seat_code, ticket_number, role, event_id")
    .eq("access_token", token)
    .single();

  if (error || !registration) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  return NextResponse.json({ user: registration });
}

import { NextRequest, NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Demo mode — accept any token
  if (!hasSupabase) {
    return NextResponse.json({
      user: {
        id: "demo-user",
        name: "Demo Viewer",
        email: "demo@doac.com",
        seatNumber: Math.floor(Math.random() * 300) + 1,
        role: "host", // demo users get host access to test everything
      },
    });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("registrations")
    .select("id, name, email, seat_number, role")
    .eq("access_token", token)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Invalid access token" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: {
      id: data.id,
      name: data.name,
      email: data.email,
      seatNumber: data.seat_number,
      role: data.role || "viewer",
    },
  });
}

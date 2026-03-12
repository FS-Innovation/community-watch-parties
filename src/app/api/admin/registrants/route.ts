import { NextResponse } from "next/server";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function GET() {
  if (!hasSupabase) {
    return NextResponse.json({
      registrants: [
        { id: "1", first_name: "Maya", email: "maya@example.com", city: "London", screen_choice: "founders-den", ticket_number: 1, seat_code: "G-12", status: "accepted", created_at: new Date().toISOString() },
        { id: "2", first_name: "James", email: "james@example.com", city: "NYC", screen_choice: "creative-studio", ticket_number: 2, seat_code: "E-08", status: "accepted", created_at: new Date().toISOString() },
        { id: "3", first_name: "Ade", email: "ade@example.com", city: "Lagos", screen_choice: "the-collective", ticket_number: 3, seat_code: "H-15", status: "accepted", created_at: new Date().toISOString() },
      ],
    });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("registrations")
    .select("id, first_name, email, city, screen_choice, ticket_number, seat_code, status, created_at")
    .order("ticket_number", { ascending: true })
    .limit(500);

  return NextResponse.json({ registrants: data || [] });
}

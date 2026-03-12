import { NextRequest, NextResponse } from "next/server";
import { SCREENS } from "@/lib/types";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

// Weighted seat code generation (lottery-style)
function generateSeatCode(): string {
  const rows = "ABCDEFGHIJKLMNOP";
  // Weighted distribution — middle rows more likely
  const weights = [1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 4, 3, 2, 2, 1, 1];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  let rowIdx = 0;
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) { rowIdx = i; break; }
  }
  const seatNum = Math.floor(Math.random() * 30) + 1;
  return `${rows[rowIdx]}-${seatNum}`;
}

// Map screen choice to segment
function screenToSegment(screenId: string): string {
  const screen = SCREENS.find((s) => s.id === screenId);
  return screen?.segment || "connector";
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { first_name, email, city, screen_choice, attention, worth_time } = body;

  if (!first_name || !email || !screen_choice) {
    return NextResponse.json({ error: "Name, email, and screen choice are required" }, { status: 400 });
  }

  const HOST_EMAILS = (process.env.HOST_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const role = HOST_EMAILS.includes(email.toLowerCase()) ? "host" : "viewer";
  const seatCode = generateSeatCode();

  // Demo mode
  if (!hasSupabase) {
    const ticketNumber = Math.floor(Math.random() * 2000) + 1;
    const demoRegistration = {
      id: "demo-" + ticketNumber,
      event_id: "demo-event",
      email,
      first_name,
      city: city || "",
      timezone: null,
      ticket_number: ticketNumber,
      seat_code: seatCode,
      screen_choice,
      room_id: null,
      status: "accepted" as const,
      referral_code: Math.random().toString(36).substring(2, 10),
      referred_by: null,
      access_token: "demo-" + Math.random().toString(36).substring(2, 14),
      role,
      created_at: new Date().toISOString(),
    };
    const demoRoom = {
      id: "demo-room",
      event_id: "demo-event",
      name: SCREENS.find((s) => s.id === screen_choice)?.name || "The Collective",
      screen_label: screen_choice,
      type: "interest" as const,
      whatsapp_invite_link: null,
      capacity: 80,
      current_count: 14,
      min_threshold: 20,
      status: "filling" as const,
    };
    return NextResponse.json({ registration: demoRegistration, room: demoRoom });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  // Check duplicate email
  const { data: existing } = await supabase
    .from("registrations")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json({ error: "This email is already registered" }, { status: 409 });
  }

  // Get active event
  const { data: event } = await supabase
    .from("events")
    .select("id, threshold")
    .in("status", ["registration", "confirmed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const eventId = event?.id;

  // Get next ticket number
  const { count: regCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const ticketNumber = (regCount || 0) + 1;

  // Find or create room for this screen
  let room = null;
  if (eventId) {
    const { data: existingRoom } = await supabase
      .from("rooms")
      .select("*")
      .eq("event_id", eventId)
      .eq("screen_label", screen_choice)
      .in("status", ["filling", "open"])
      .limit(1)
      .single();

    if (existingRoom) {
      room = existingRoom;
      // Increment count
      await supabase
        .from("rooms")
        .update({
          current_count: existingRoom.current_count + 1,
          status: existingRoom.current_count + 1 >= existingRoom.min_threshold ? "open" : "filling",
        })
        .eq("id", existingRoom.id);
      room.current_count = existingRoom.current_count + 1;
      if (room.current_count >= existingRoom.min_threshold) room.status = "open";
    }
  }

  // Insert registration
  const { data: registration, error: insertError } = await supabase
    .from("registrations")
    .insert({
      event_id: eventId,
      email,
      first_name,
      city: city || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ticket_number: ticketNumber,
      seat_code: seatCode,
      screen_choice,
      room_id: room?.id || null,
      status: "accepted",
      referred_by: body.referral_code || null,
      role,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Registration error:", insertError);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }

  // Store signal responses (AI-tagged later via background job)
  if (attention || worth_time) {
    const signals = [];
    if (attention) signals.push({ registration_id: registration.id, question_key: "attention", answer_text: attention });
    if (worth_time) signals.push({ registration_id: registration.id, question_key: "worth_time", answer_text: worth_time });

    await supabase.from("signal_responses").insert(signals);
  }

  // Create segment entry
  const primarySegment = screenToSegment(screen_choice);
  const screen = SCREENS.find((s) => s.id === screen_choice);
  await supabase.from("segments").insert({
    registration_id: registration.id,
    primary_segment: primarySegment,
    geography_cluster: screen?.type === "geography" ? screen_choice : null,
  });

  return NextResponse.json({ registration, room });
}

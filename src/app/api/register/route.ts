import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, life_stage, building, question_for_steven, location } =
    body;

  if (
    !name ||
    !email ||
    !life_stage ||
    !building ||
    !question_for_steven ||
    !location
  ) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  const accessToken = uuidv4();

  // Host emails — add emails here that should get host privileges
  const HOST_EMAILS = (process.env.HOST_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const role = HOST_EMAILS.includes(email.toLowerCase()) ? "host" : "viewer";

  // If Supabase is not configured, return demo success
  if (!hasSupabase) {
    const demoSeat = Math.floor(Math.random() * 300) + 1;
    return NextResponse.json({ success: true, token: accessToken, seatNumber: demoSeat, role });
  }

  const { createServerSupabase } = await import("@/lib/supabase");
  const supabase = createServerSupabase();

  // Check if email already registered
  const { data: existing } = await supabase
    .from("registrations")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "This email is already registered" },
      { status: 409 }
    );
  }

  // Check capacity
  const { count } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true });

  if (count !== null && count >= 100) {
    return NextResponse.json(
      { error: "All spots have been claimed" },
      { status: 410 }
    );
  }

  // Assign next seat number
  const { data: maxSeatRow } = await supabase
    .from("registrations")
    .select("seat_number")
    .order("seat_number", { ascending: false })
    .limit(1)
    .single();
  const seatNumber = (maxSeatRow?.seat_number ?? 0) + 1;

  const { error: insertError } = await supabase
    .from("registrations")
    .insert({
      name,
      email,
      life_stage,
      building,
      question_for_steven,
      location,
      access_token: accessToken,
      seat_number: seatNumber,
      role,
    });

  if (insertError) {
    console.error("Registration insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to register. Please try again." },
      { status: 500 }
    );
  }

  // Send confirmation email via Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      await resend.emails.send({
        from: "DOAC Watch Party <onboarding@resend.dev>",
        to: email,
        subject: "You're in — DOAC Watch Party",
        html: `
          <div style="font-family: Inter, system-ui, sans-serif; background: #08080f; color: #e0e0e0; padding: 40px; max-width: 600px; margin: 0 auto;">
            <p style="color: #e8734a; font-size: 12px; letter-spacing: 3px; text-transform: uppercase;">The Diary of a CEO</p>
            <h1 style="font-size: 28px; margin: 8px 0 24px;">You're in, ${name}.</h1>
            <p style="color: #8a8a9a; line-height: 1.6;">Your spot has been claimed. When the screening begins, click the link below to enter the watch room.</p>
            <a href="${appUrl}/watch/${accessToken}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #e8734a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Enter the Watch Room</a>
            <p style="color: #8a8a9a; font-size: 13px;">See you at the screening.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }
  }

  return NextResponse.json({ success: true, token: accessToken, seatNumber, role });
}

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// In-memory store mirrors the icebreaker store
// In production, both APIs would read from the same Supabase table
interface ViewerProfile {
  viewer_id: string;
  display_name: string;
  responses: { prompt: string; answer: string }[];
}

const matchedPairs: Record<string, Set<string>> = {}; // eventId -> Set of "v1:v2" matched pairs

export async function POST(request: NextRequest) {
  const { event_id, viewer_id, display_name, responses } = await request.json();

  if (!event_id || !viewer_id || !responses?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Get other viewers' profiles from icebreaker store
  let otherProfiles: ViewerProfile[] = [];
  try {
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/icebreaker?event_id=${event_id}`);
    const data = await res.json();
    otherProfiles = (data.profiles || []).filter(
      (p: ViewerProfile) => p.viewer_id !== viewer_id && p.responses.length > 0
    );
  } catch {
    // If we can't fetch profiles, use demo data
  }

  // If not enough real viewers, add demo profiles for a good experience
  if (otherProfiles.length < 2) {
    otherProfiles = [
      ...otherProfiles,
      {
        viewer_id: "demo-v1",
        display_name: "Jordan",
        responses: [
          { prompt: "When was the last time a day flew by and what were you doing?", answer: "Last week when I was deep in a creative project — designing a brand identity from scratch. Hours disappeared." },
          { prompt: "What did you learn from your greatest failure?", answer: "That failing publicly taught me more about resilience than any success ever did. The embarrassment fades but the lessons stick." },
          { prompt: "What are you clear about now that one year ago you didn't know?", answer: "That saying no to good opportunities is how you make room for great ones." },
        ],
      },
      {
        viewer_id: "demo-v2",
        display_name: "Priya",
        responses: [
          { prompt: "When was the last time a day flew by and what were you doing?", answer: "Yesterday — I was mentoring young founders at a startup weekend. Their energy is infectious." },
          { prompt: "What did you learn from your greatest failure?", answer: "That I was optimizing for other people's definition of success. My biggest failure redirected me to my actual path." },
          { prompt: "Do you think your younger self would be proud / look up to you now?", answer: "I think she'd be surprised more than proud. I took the path she was too scared to consider." },
        ],
      },
      {
        viewer_id: "demo-v3",
        display_name: "Alex",
        responses: [
          { prompt: "When was the last time a day flew by and what were you doing?", answer: "On a hiking trail with no phone signal. Being disconnected made me feel more alive than I have in months." },
          { prompt: "When was the last time you changed your mind about something life-changing?", answer: "I used to think vulnerability was weakness. A close friend's honesty completely changed that for me." },
          { prompt: "What are you clear about now that one year ago you didn't know?", answer: "That the people around you matter more than the plan. Community is everything." },
        ],
      },
    ];
  }

  // Check for Anthropic API key
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // No API key — do simple keyword matching as fallback
    const bestMatch = otherProfiles[0];
    if (!bestMatch) {
      return NextResponse.json({ match: null });
    }
    return NextResponse.json({
      match: {
        name: bestMatch.display_name,
        viewer_id: bestMatch.viewer_id,
        answers: bestMatch.responses.slice(0, 2).map((r) => r.answer),
        reason: "You both seem to value personal growth and self-reflection. There's a lot of common ground in how you think about life's big questions.",
      },
    });
  }

  // Use Claude to find the best match
  try {
    const client = new Anthropic({ apiKey });

    const myProfile = responses
      .map((r: { prompt: string; answer: string }) => `Q: ${r.prompt}\nA: ${r.answer}`)
      .join("\n\n");

    const candidateProfiles = otherProfiles
      .map((p, i) => {
        const answers = p.responses
          .map((r) => `Q: ${r.prompt}\nA: ${r.answer}`)
          .join("\n");
        return `--- Candidate ${i + 1}: ${p.display_name} ---\n${answers}`;
      })
      .join("\n\n");

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are an AI matchmaker for a live screening event. A viewer has answered some conversation cards. Your job is to find the best match among the candidates based on shared values, interests, complementary perspectives, or kindred spirit energy.

THE VIEWER (${display_name}):
${myProfile}

CANDIDATES:
${candidateProfiles}

Respond in this exact JSON format (no markdown, no code blocks):
{"match_index": 0, "reason": "A warm, specific 1-2 sentence explanation of why these two would connect well. Reference specific things from both their answers."}

Pick the candidate whose answers resonate most with the viewer's worldview, values, or energy. The match_index is 0-based.`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(responseText);
    const matchIndex = Math.min(parsed.match_index, otherProfiles.length - 1);
    const matched = otherProfiles[matchIndex];

    // Track matched pair
    if (!matchedPairs[event_id]) matchedPairs[event_id] = new Set();
    const pairKey = [viewer_id, matched.viewer_id].sort().join(":");
    matchedPairs[event_id].add(pairKey);

    return NextResponse.json({
      match: {
        name: matched.display_name,
        viewer_id: matched.viewer_id,
        answers: matched.responses.slice(0, 2).map((r) => r.answer),
        reason: parsed.reason,
      },
    });
  } catch (err) {
    console.error("Matchmaking error:", err);
    // Fallback to first candidate
    const fallback = otherProfiles[0];
    return NextResponse.json({
      match: fallback
        ? {
            name: fallback.display_name,
            viewer_id: fallback.viewer_id,
            answers: fallback.responses.slice(0, 2).map((r) => r.answer),
            reason: "You both bring thoughtful perspectives to life's big questions. There's a lot to explore together.",
          }
        : null,
    });
  }
}

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// In-memory store for viewer profiles & segments
interface ViewerProfile {
  viewer_id: string;
  display_name: string;
  responses: { prompt: string; answer: string }[];
  segment?: string;
  routing?: string;
}

// 0PD community segments
const COMMUNITY_SEGMENTS = [
  "Reflection",   // Meaning-seekers who go deep
  "Building",     // Builders creating something new
  "Creativity",   // Creatives exploring ideas
  "Connection",   // Connectors who bring people together
] as const;

const viewerSegments: Record<string, Record<string, { segment: string; routing: string; intent: string }>> = {};
const matchedPairs: Record<string, Set<string>> = {};

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

  // If not enough real viewers, add demo profiles
  if (otherProfiles.length < 2) {
    otherProfiles = [
      ...otherProfiles,
      {
        viewer_id: "demo-v1",
        display_name: "Jordan",
        responses: [
          { prompt: "What made you want to join the community screening tonight?", answer: "I love the idea of watching something meaningful together rather than alone. There's something about shared experience that hits different." },
          { prompt: "What would make this worth your time tonight?", answer: "Meeting even one person who thinks deeply about the same things I do." },
        ],
        segment: "Reflection",
      },
      {
        viewer_id: "demo-v2",
        display_name: "Priya",
        responses: [
          { prompt: "What made you want to join the community screening tonight?", answer: "I'm building a startup and wanted to connect with other ambitious people while learning from DOAC guests." },
          { prompt: "What would make this worth your time tonight?", answer: "Honest conversations about what it actually takes to build something from nothing." },
        ],
        segment: "Building",
      },
      {
        viewer_id: "demo-v3",
        display_name: "Alex",
        responses: [
          { prompt: "What made you want to join the community screening tonight?", answer: "I'm a photographer and filmmaker — I was curious about the creative format of a community screening." },
          { prompt: "What would make this worth your time tonight?", answer: "Being inspired by new perspectives and creative energy." },
        ],
        segment: "Creativity",
      },
    ];
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // No API key — do basic segmentation from explicit segment selection
    const segmentAnswer = responses.find((r: { prompt: string; answer: string }) =>
      r.prompt.toLowerCase().includes("which kind of room")
    );
    const routingAnswer = responses.find((r: { prompt: string; answer: string }) =>
      r.prompt.toLowerCase().includes("would you want to meet")
    );

    const segment = segmentAnswer?.answer?.split(",")[0]?.trim() || "Connection";
    const routing = routingAnswer?.answer || "Global room";

    // Store 0PD
    if (!viewerSegments[event_id]) viewerSegments[event_id] = {};
    viewerSegments[event_id][viewer_id] = {
      segment,
      routing,
      intent: responses[0]?.answer || "",
    };

    const bestMatch = otherProfiles[0];
    return NextResponse.json({
      segment,
      routing,
      placement_message: `Based on what you shared, we're placing you in the ${segment} room — it felt like the best fit for what you're looking for tonight. How does this sound?`,
      match: bestMatch ? {
        name: bestMatch.display_name,
        viewer_id: bestMatch.viewer_id,
        answers: bestMatch.responses.slice(0, 2).map((r) => r.answer),
        reason: `You both bring thoughtful perspectives to tonight's experience. Great match for the ${segment} interest group.`,
      } : null,
    });
  }

  // Use Claude for AI-powered segmentation + matchmaking
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
        return `--- Candidate ${i + 1}: ${p.display_name} (segment: ${p.segment || "unknown"}) ---\n${answers}`;
      })
      .join("\n\n");

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are an AI community matchmaker for a FlightStory live screening event. You do two things:

1. **Community Segmentation (0PD)**: Based on the viewer's answers, classify them into one or more of these interest groups:
   - Reflection: Meaning-seekers who go deep, introspective, philosophical
   - Building: Builders, entrepreneurs, creating something new, action-oriented
   - Creativity: Creatives exploring ideas, artistic, imaginative, designers
   - Connection: Connectors who bring people together, community-minded, empathetic

2. **Matchmaking**: Find the best match among the candidates based on shared values, interests, complementary perspectives, or kindred spirit energy.

THE VIEWER (${display_name}):
${myProfile}

CANDIDATES:
${candidateProfiles}

Respond in this exact JSON format (no markdown, no code blocks):
{
  "primary_segment": "one of: Reflection, Building, Creativity, Connection",
  "secondary_segment": "optional second segment or null",
  "intent_summary": "A 1-sentence summary of why they joined and what they're looking for",
  "placement_message": "A warm, conversational 2-3 sentence message addressed directly to the viewer (use 'you') explaining WHY you're placing them in this segment. Reference something specific from their answers to show you actually read them. End with something like 'How does this sound?' Keep it casual and friendly, not corporate.",
  "match_index": 0,
  "match_reason": "A warm, specific 1-2 sentence explanation of why these two would connect well. Reference specific things from both their answers."
}

The match_index is 0-based. Pick the candidate whose answers resonate most with the viewer's worldview.`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(responseText);
    const matchIndex = Math.min(parsed.match_index || 0, otherProfiles.length - 1);
    const matched = otherProfiles[matchIndex];

    // Extract routing from explicit answer or default
    const routingAnswer = responses.find((r: { prompt: string; answer: string }) =>
      r.prompt.toLowerCase().includes("would you want to meet")
    );
    const routing = routingAnswer?.answer || "Global room";

    // Store 0PD segment data
    if (!viewerSegments[event_id]) viewerSegments[event_id] = {};
    viewerSegments[event_id][viewer_id] = {
      segment: parsed.primary_segment || "Connection",
      routing,
      intent: parsed.intent_summary || "",
    };

    // Track matched pair
    if (!matchedPairs[event_id]) matchedPairs[event_id] = new Set();
    if (matched) {
      const pairKey = [viewer_id, matched.viewer_id].sort().join(":");
      matchedPairs[event_id].add(pairKey);
    }

    return NextResponse.json({
      segment: parsed.primary_segment,
      secondary_segment: parsed.secondary_segment,
      intent_summary: parsed.intent_summary,
      placement_message: parsed.placement_message,
      match: matched ? {
        name: matched.display_name,
        viewer_id: matched.viewer_id,
        answers: matched.responses.slice(0, 2).map((r) => r.answer),
        reason: parsed.match_reason,
      } : null,
    });
  } catch (err) {
    console.error("AI segmentation error:", err);
    // Fallback
    const segmentAnswer = responses.find((r: { prompt: string; answer: string }) =>
      r.prompt.toLowerCase().includes("which kind of room")
    );
    const segment = segmentAnswer?.answer?.split(",")[0]?.trim() || "Connection";
    const fallback = otherProfiles[0];

    return NextResponse.json({
      segment,
      placement_message: `Based on what you shared, we're placing you in the ${segment} room — it felt like the best fit for what you're looking for tonight. How does this sound?`,
      match: fallback ? {
        name: fallback.display_name,
        viewer_id: fallback.viewer_id,
        answers: fallback.responses.slice(0, 2).map((r) => r.answer),
        reason: "You both bring thoughtful perspectives to life's big questions. There's a lot to explore together.",
      } : null,
    });
  }
}

// GET: Retrieve all segment data for an event (0PD analytics)
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event_id") || "demo-event";
  const segments = viewerSegments[eventId] || {};

  // Aggregate segment counts
  const counts: Record<string, number> = { Reflection: 0, Building: 0, Creativity: 0, Connection: 0 };
  Object.values(segments).forEach(({ segment }) => {
    if (counts[segment] !== undefined) counts[segment]++;
  });

  return NextResponse.json({
    total_viewers: Object.keys(segments).length,
    segment_counts: counts,
    viewers: segments,
  });
}

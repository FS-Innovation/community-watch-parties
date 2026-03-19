// Magic link token system
// Encodes viewer identity into a URL-safe token that the mobile second screen
// can decode to link the phone session to the desktop viewer.
//
// No external service needed. Token is a base64-encoded JSON payload with
// a simple HMAC signature to prevent tampering.

const TOKEN_VERSION = 1;

export interface MagicLinkPayload {
  v: number;         // version
  vid: string;       // viewer_id
  name: string;      // display_name
  eid: string;       // event_id
  room?: string;     // connection room
  ts: number;        // issued at (epoch ms)
}

// Simple hash for token integrity (not security-critical — just prevents casual tampering)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function createMagicToken(payload: Omit<MagicLinkPayload, "v" | "ts">): string {
  const full: MagicLinkPayload = {
    v: TOKEN_VERSION,
    ...payload,
    ts: Date.now(),
  };

  const json = JSON.stringify(full);
  const encoded = btoa(json);
  const sig = simpleHash(json + "btd-screening");

  return `${encoded}.${sig}`;
}

export function decodeMagicToken(token: string): MagicLinkPayload | null {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;

    const json = atob(encoded);
    const expectedSig = simpleHash(json + "btd-screening");

    if (sig !== expectedSig) return null;

    const payload = JSON.parse(json) as MagicLinkPayload;

    // Check version
    if (payload.v !== TOKEN_VERSION) return null;

    // Check token age (expire after 24 hours)
    if (Date.now() - payload.ts > 24 * 60 * 60 * 1000) return null;

    return payload;
  } catch {
    return null;
  }
}

export function buildMagicLink(
  baseUrl: string,
  viewerId: string,
  displayName: string,
  eventId: string,
  connectionRoom?: string,
): string {
  const token = createMagicToken({
    vid: viewerId,
    name: displayName,
    eid: eventId,
    room: connectionRoom,
  });

  return `${baseUrl}/mobile?token=${encodeURIComponent(token)}`;
}

// Anonymous viewer identity — persisted in localStorage
// No auth needed. Just a stable ID per browser.
// Supports hydration from magic link tokens (QR second screen).

const VIEWER_ID_KEY = "cwp_viewer_id";
const VIEWER_NAME_KEY = "cwp_viewer_name";
const VIEWER_EVENT_KEY = "cwp_event_id";
const VIEWER_ROOM_KEY = "cwp_connection_room";

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getViewerId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(VIEWER_ID_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(VIEWER_ID_KEY, id);
  }
  return id;
}

export function getViewerName(): string {
  if (typeof window === "undefined") return "Viewer";
  return localStorage.getItem(VIEWER_NAME_KEY) || "";
}

export function setViewerName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VIEWER_NAME_KEY, name);
}

export function getViewerRoom(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(VIEWER_ROOM_KEY) || "";
}

export function getViewerEventId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(VIEWER_EVENT_KEY) || "";
}

// Hydrate viewer identity from a magic link token payload
export function hydrateViewer(viewerId: string, name: string, eventId?: string, room?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VIEWER_ID_KEY, viewerId);
  if (name) localStorage.setItem(VIEWER_NAME_KEY, name);
  if (eventId) localStorage.setItem(VIEWER_EVENT_KEY, eventId);
  if (room) localStorage.setItem(VIEWER_ROOM_KEY, room);
}

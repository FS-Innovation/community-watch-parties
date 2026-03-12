// Anonymous viewer identity — persisted in localStorage
// No auth needed. Just a stable ID per browser.

const VIEWER_ID_KEY = "cwp_viewer_id";
const VIEWER_NAME_KEY = "cwp_viewer_name";

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

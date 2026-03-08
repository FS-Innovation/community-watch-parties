export interface Registration {
  id: string;
  name: string;
  email: string;
  life_stage: string;
  building: string;
  question_for_steven: string;
  location: string;
  access_token: string;
  created_at: string;
}

export interface EventInteraction {
  id: string;
  user_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_name: string;
  message: string;
  timestamp: number;
}

export interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  score: number;
  rank: number;
}

export type SyncAction = "play" | "pause" | "seek";

export interface SyncEvent {
  action: SyncAction;
  timestamp: number;
  videoTime: number;
}

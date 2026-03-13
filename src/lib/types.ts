// ─── Event ───

export type EventStatus = 'waiting' | 'countdown' | 'live' | 'ended';

export interface WatchEvent {
  id: string;
  title: string;
  mux_playback_id: string | null;
  status: EventStatus;
  created_at: string;
}

// ─── Sync State (broadcast via Supabase Realtime) ───

export interface SyncState {
  timestamp: number;     // current playback position in seconds
  state: 'playing' | 'paused';
  rate: number;          // playback rate (1.0 normal)
  updated_at: number;    // epoch ms when this was sent
}

// ─── Conversation Cards + Interactive Moments ───

export type CardType = 'card' | 'quiz' | 'poll' | 'replay' | 'teaser';
export type ResponseType = 'text' | 'emoji_choice' | 'multiple_choice';

export interface ConversationCard {
  id: string;
  event_id: string;
  type: CardType;
  trigger_time_seconds: number;
  prompt_text: string;
  options: string[] | null;       // for quiz/poll/multiple_choice
  response_type: ResponseType;
  auto_dismiss_seconds: number;
  show_results: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface CardResponse {
  id: string;
  card_id: string;
  event_id: string;
  viewer_id: string;
  response_value: string;
  responded_at: string;
}

// ─── Reactions ───

export const REACTIONS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '🤯', label: 'Mind-blown' },
  { emoji: '😂', label: 'Laughing' },
  { emoji: '👏', label: 'Clapping' },
] as const;

export type ReactionEmoji = typeof REACTIONS[number]['emoji'];

// ─── Host Camera Layout ───

export type HostLayout = 'pip' | 'side';

// ─── Pre-Show Phases ───

export type PreShowPhase = 'arrival' | 'warmup' | 'build' | 'silence' | 'curtain' | 'live';

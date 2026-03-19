// ─── Event ───

export type EventStatus = 'waiting' | 'countdown' | 'live' | 'afterparty' | 'ended';

export interface WatchEvent {
  id: string;
  title: string;
  episode_number: number | null;
  mux_playback_id: string | null;
  spotify_playlist_url: string | null;
  status: EventStatus;
  scheduled_at: string | null;
  created_at: string;
}

// ─── Sync State (broadcast via Supabase Realtime) ───

export interface SyncState {
  timestamp: number;     // current playback position in seconds
  state: 'playing' | 'paused';
  rate: number;          // playback rate (1.0 normal)
  updated_at: number;    // epoch ms when this was sent
}

// ─── Room State (persistent in Supabase) ───

export interface RoomState {
  event_id: string;
  sync_timestamp: number;
  sync_state: 'playing' | 'paused';
  sync_rate: number;
  sync_updated_at: number;
  event_status: EventStatus;
  host_layout: HostLayout;
  host_visible: boolean;
  countdown_start: number | null;
  countdown_duration: number;
  curtains_open: boolean;
  playback_id: string | null;
  spotify_playlist_url: string | null;
}

// ─── Conversation Cards + Interactive Moments ───

export type CardType = 'card' | 'quiz' | 'poll' | 'replay' | 'teaser' | 'reaction_prompt' | 'this_or_that';
export type ResponseType = 'text' | 'emoji_choice' | 'multiple_choice' | 'binary_choice';

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

// ─── Activity Feed ───

export type ActivityType = 'chat' | 'reaction' | 'milestone' | 'join' | 'reaction_prompt' | 'poll_result' | 'this_or_that' | 'word_cloud' | 'highlight' | 'system';

export interface ActivityItem {
  id: string;
  event_id: string;
  type: ActivityType;
  viewer_id: string | null;
  display_name: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Reaction Prompts ───

export interface ReactionPrompt {
  id: string;
  event_id: string;
  trigger_time_seconds: number;
  prompt_text: string;
  emoji_options: string[];
  duration_seconds: number;
  is_active: boolean;
}

// ─── This or That ───

export interface ThisOrThat {
  id: string;
  event_id: string;
  option_a: string;
  option_b: string;
  phase: 'lobby' | 'afterparty';
  is_active: boolean;
  sort_order: number;
}

export interface ThisOrThatVote {
  id: string;
  game_id: string;
  event_id: string;
  viewer_id: string;
  choice: 'a' | 'b';
}

// ─── Viewer Profile ───

export interface ViewerProfile {
  id: string;
  viewer_id: string;
  display_name: string | null;
  email: string | null;
  location: string | null;
  avatar_url: string | null;
  registration_answers: Record<string, unknown> | null;
  connection_room: string | null;
  total_screenings: number;
  total_reactions: number;
  total_chat_messages: number;
  total_breakout_minutes: number;
  created_at: string;
}

// ─── Badges ───

export type BadgeCategory = 'attendance' | 'engagement' | 'special' | 'milestone';

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: BadgeCategory;
}

export interface ViewerBadge {
  id: string;
  viewer_id: string;
  badge_id: string;
  event_id: string | null;
  earned_at: string;
  badge?: Badge;
}

// ─── Screening Receipt ───

export interface ScreeningReceipt {
  id: string;
  viewer_id: string;
  event_id: string;
  episode_title: string | null;
  episode_number: number | null;
  viewer_count: number | null;
  connection_room: string | null;
  join_time: string | null;
  leave_time: string | null;
  watch_duration_seconds: number | null;
  reaction_count: number;
  chat_count: number;
  breakout_duration_seconds: number;
  badges_earned: string[];
  takeaway_text: string | null;
  created_at: string;
}

// ─── Viewer Questions ───

export interface ViewerQuestion {
  id: string;
  event_id: string;
  viewer_id: string;
  display_name: string;
  question_text: string;
  source: 'registration' | 'live' | 'chat';
  is_featured: boolean;
  is_answered: boolean;
  upvotes: number;
  created_at: string;
}

// ─── Breakout Rooms ───

export interface BreakoutRoom {
  id: string;
  event_id: string;
  room_name: string;
  livekit_room_name: string | null;
  max_participants: number;
  current_participants: number;
  tags: string[];
  phase: 'lobby' | 'afterparty';
  is_active: boolean;
}

// ─── Word Cloud ───

export interface WordCloudResponse {
  id: string;
  event_id: string;
  viewer_id: string;
  response_text: string;
  created_at: string;
}

// ─── Database Types ───

export type EventStatus = 'draft' | 'registration' | 'confirmed' | 'live' | 'ended';
export type RegistrationStatus = 'pending' | 'accepted' | 'waitlisted';
export type SegmentType = 'meaning-seeker' | 'builder' | 'creative' | 'connector';
export type RoomType = 'interest' | 'geography' | 'global';
export type RoomStatus = 'filling' | 'open' | 'merged' | 'closed';
export type MatchStatus = 'pending' | 'accepted' | 'declined';
export type CardResponseType = 'text' | 'emoji' | 'choice';

export interface Event {
  id: string;
  title: string;
  episode_id: string | null;
  status: EventStatus;
  threshold: number;
  screening_date: string | null;
  mux_playback_id: string | null;
  mux_asset_id: string | null;
  livekit_room_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  email: string;
  first_name: string;
  city: string | null;
  timezone: string | null;
  ticket_number: number | null;
  seat_code: string | null;
  screen_choice: string;
  room_id: string | null;
  status: RegistrationStatus;
  referral_code: string;
  referred_by: string | null;
  access_token: string;
  role: string;
  created_at: string;
}

export interface SignalResponse {
  id: string;
  registration_id: string;
  question_key: string;
  answer_text: string;
  ai_tags: Record<string, unknown>;
  segment_tag: string | null;
  confidence_score: number | null;
  created_at: string;
}

export interface Segment {
  id: string;
  registration_id: string;
  primary_segment: SegmentType;
  geography_cluster: string | null;
  intent_level: string;
}

export interface Room {
  id: string;
  event_id: string;
  name: string;
  screen_label: string;
  type: RoomType;
  whatsapp_invite_link: string | null;
  capacity: number;
  current_count: number;
  min_threshold: number;
  status: RoomStatus;
}

export interface EventEngagement {
  id: string;
  registration_id: string;
  event_id: string;
  reactions_count: number;
  cards_responded: number;
  qa_submitted: number;
  qa_upvotes: number;
  watch_duration_seconds: number;
  engagement_score: number;
}

export interface MatchRecommendation {
  id: string;
  event_id: string;
  user_a_id: string;
  user_b_id: string;
  match_reason: string;
  status: MatchStatus;
  created_at: string;
}

export interface ConversationCard {
  id: string;
  event_id: string;
  trigger_time_seconds: number;
  prompt_text: string;
  response_type: CardResponseType;
  choices: string[] | null;
  is_active: boolean;
}

export interface Question {
  id: string;
  event_id: string;
  registration_id: string;
  question: string;
  upvotes: number;
  is_answered: boolean;
  created_at: string;
}

// ─── Screen Definitions ───

export interface Screen {
  id: string;
  name: string;
  description: string;
  segment: SegmentType;
  type: RoomType;
  icon: string;
  color: string;
}

export const SCREENS: Screen[] = [
  {
    id: 'reflection-room',
    name: 'The Reflection Room',
    description: 'For those who watch to feel something deeper',
    segment: 'meaning-seeker',
    type: 'interest',
    icon: '🪞',
    color: '#8B5CF6',
  },
  {
    id: 'founders-den',
    name: "Founder's Den",
    description: 'Watch with people building something of their own',
    segment: 'builder',
    type: 'interest',
    icon: '🔥',
    color: '#F59E0B',
  },
  {
    id: 'creative-studio',
    name: 'Creative Studio',
    description: 'For the storytellers, makers, and craft-obsessed',
    segment: 'creative',
    type: 'interest',
    icon: '🎬',
    color: '#EC4899',
  },
  {
    id: 'the-collective',
    name: 'The Collective',
    description: 'Come for the episode, stay for the people',
    segment: 'connector',
    type: 'global',
    icon: '🤝',
    color: '#06B6D4',
  },
  {
    id: 'locals-london',
    name: 'Locals: London',
    description: 'Your London watch party crew',
    segment: 'connector',
    type: 'geography',
    icon: '📍',
    color: '#10B981',
  },
  {
    id: 'locals-nyc',
    name: 'Locals: NYC',
    description: 'New York, same room',
    segment: 'connector',
    type: 'geography',
    icon: '📍',
    color: '#10B981',
  },
  {
    id: 'night-owls',
    name: 'Night Owls',
    description: 'Late-night thinkers and overthinkers',
    segment: 'meaning-seeker',
    type: 'interest',
    icon: '🌙',
    color: '#6366F1',
  },
  {
    id: 'the-lab',
    name: 'The Lab',
    description: 'AI, tech, and what comes next',
    segment: 'builder',
    type: 'interest',
    icon: '🧪',
    color: '#14B8A6',
  },
];

// ─── Reaction Types ───

export const REACTIONS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '🤯', label: 'Mind-blown' },
  { emoji: '😂', label: 'Laughing' },
  { emoji: '👏', label: 'Clapping' },
] as const;

export type ReactionType = typeof REACTIONS[number]['emoji'];

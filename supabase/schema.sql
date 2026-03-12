-- Community Watch Party MVP — Supabase Schema
-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

-- ─── Events ───
create table if not exists events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  episode_id text,
  status text default 'draft' check (status in ('draft', 'registration', 'confirmed', 'live', 'ended')),
  threshold integer default 1000,
  screening_date timestamp with time zone,
  mux_playback_id text,
  mux_asset_id text,
  livekit_room_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ─── Registrations ───
create table if not exists registrations (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade,
  email text not null,
  first_name text not null,
  city text,
  timezone text,
  ticket_number integer,
  seat_code text,
  screen_choice text not null,
  room_id uuid,
  status text default 'pending' check (status in ('pending', 'accepted', 'waitlisted')),
  referral_code text unique default encode(gen_random_bytes(6), 'hex'),
  referred_by text,
  access_token uuid default uuid_generate_v4() unique not null,
  role text default 'viewer' check (role in ('viewer', 'host', 'admin')),
  created_at timestamp with time zone default now()
);

-- ─── Signal Responses (registration questions, AI-tagged) ───
create table if not exists signal_responses (
  id uuid default uuid_generate_v4() primary key,
  registration_id uuid references registrations(id) on delete cascade,
  question_key text not null,
  answer_text text not null,
  ai_tags jsonb default '{}',
  segment_tag text,
  confidence_score numeric(3,2),
  created_at timestamp with time zone default now()
);

-- ─── Segments (server-side, invisible to user) ───
create table if not exists segments (
  id uuid default uuid_generate_v4() primary key,
  registration_id uuid references registrations(id) on delete cascade unique,
  primary_segment text check (primary_segment in ('meaning-seeker', 'builder', 'creative', 'connector')),
  geography_cluster text,
  intent_level text default 'medium' check (intent_level in ('low', 'medium', 'high'))
);

-- ─── Rooms (WhatsApp routing) ───
create table if not exists rooms (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade,
  name text not null,
  screen_label text not null,
  type text default 'interest' check (type in ('interest', 'geography', 'global')),
  whatsapp_invite_link text,
  capacity integer default 80,
  current_count integer default 0,
  min_threshold integer default 20,
  status text default 'filling' check (status in ('filling', 'open', 'merged', 'closed'))
);

-- ─── Event Engagement (screening interactions) ───
create table if not exists event_engagement (
  id uuid default uuid_generate_v4() primary key,
  registration_id uuid references registrations(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  reactions_count integer default 0,
  cards_responded integer default 0,
  qa_submitted integer default 0,
  qa_upvotes integer default 0,
  watch_duration_seconds integer default 0,
  engagement_score integer default 0
);

-- ─── Match Recommendations (AI matchmaking) ───
create table if not exists match_recommendations (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade,
  user_a_id uuid references registrations(id) on delete cascade,
  user_b_id uuid references registrations(id) on delete cascade,
  match_reason text,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone default now()
);

-- ─── Conversation Cards (timed prompts during screening) ───
create table if not exists conversation_cards (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade,
  trigger_time_seconds integer not null,
  prompt_text text not null,
  response_type text default 'text' check (response_type in ('text', 'emoji', 'choice')),
  choices jsonb,
  is_active boolean default true
);

-- ─── Card Responses ───
create table if not exists card_responses (
  id uuid default uuid_generate_v4() primary key,
  card_id uuid references conversation_cards(id) on delete cascade,
  registration_id uuid references registrations(id) on delete cascade,
  response_text text,
  response_emoji text,
  response_choice text,
  created_at timestamp with time zone default now()
);

-- ─── Q&A Questions ───
create table if not exists questions (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade,
  registration_id uuid references registrations(id) on delete cascade,
  question text not null,
  upvotes integer default 0,
  is_answered boolean default false,
  created_at timestamp with time zone default now()
);

-- ─── Q&A Upvotes ───
create table if not exists question_upvotes (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references questions(id) on delete cascade,
  registration_id uuid references registrations(id) on delete cascade,
  unique(question_id, registration_id)
);

-- ─── Indexes ───
create index if not exists idx_registrations_email on registrations(email);
create index if not exists idx_registrations_token on registrations(access_token);
create index if not exists idx_registrations_event on registrations(event_id);
create index if not exists idx_registrations_room on registrations(room_id);
create index if not exists idx_registrations_referral on registrations(referral_code);
create index if not exists idx_signal_responses_reg on signal_responses(registration_id);
create index if not exists idx_rooms_event on rooms(event_id);
create index if not exists idx_rooms_status on rooms(status);
create index if not exists idx_engagement_event on event_engagement(event_id);
create index if not exists idx_engagement_score on event_engagement(engagement_score desc);
create index if not exists idx_cards_event on conversation_cards(event_id);
create index if not exists idx_questions_event on questions(event_id);
create index if not exists idx_questions_upvotes on questions(upvotes desc);

-- ─── Row Level Security ───
alter table events enable row level security;
alter table registrations enable row level security;
alter table signal_responses enable row level security;
alter table segments enable row level security;
alter table rooms enable row level security;
alter table event_engagement enable row level security;
alter table match_recommendations enable row level security;
alter table conversation_cards enable row level security;
alter table card_responses enable row level security;
alter table questions enable row level security;
alter table question_upvotes enable row level security;

-- Public read policies
create policy "anon_read_events" on events for select using (true);
create policy "anon_read_rooms" on rooms for select using (true);
create policy "anon_read_engagement" on event_engagement for select using (true);
create policy "anon_read_questions" on questions for select using (true);
create policy "anon_read_cards" on conversation_cards for select using (true);

-- Service role full access
create policy "service_events" on events for all using (auth.role() = 'service_role');
create policy "service_registrations" on registrations for all using (auth.role() = 'service_role');
create policy "service_signals" on signal_responses for all using (auth.role() = 'service_role');
create policy "service_segments" on segments for all using (auth.role() = 'service_role');
create policy "service_rooms" on rooms for all using (auth.role() = 'service_role');
create policy "service_engagement" on event_engagement for all using (auth.role() = 'service_role');
create policy "service_matches" on match_recommendations for all using (auth.role() = 'service_role');
create policy "service_cards" on conversation_cards for all using (auth.role() = 'service_role');
create policy "service_card_responses" on card_responses for all using (auth.role() = 'service_role');
create policy "service_questions" on questions for all using (auth.role() = 'service_role');
create policy "service_upvotes" on question_upvotes for all using (auth.role() = 'service_role');

-- Enable realtime
alter publication supabase_realtime add table registrations;
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table event_engagement;
alter publication supabase_realtime add table questions;

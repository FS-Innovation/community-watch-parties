-- Virtual Watch Party — Supabase Schema v2
-- Full schema for Behind The Diary screening experience

create extension if not exists "uuid-ossp";

-- ─── Events ───
create table if not exists events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  episode_number integer,
  mux_playback_id text,
  spotify_playlist_url text,           -- Steven's playlist for lobby
  status text default 'waiting' check (status in ('waiting', 'countdown', 'live', 'afterparty', 'ended')),
  scheduled_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- ─── Room State (persistent sync — replaces in-memory) ───
create table if not exists room_state (
  event_id text primary key,
  sync_timestamp float default 0,
  sync_state text default 'paused' check (sync_state in ('playing', 'paused')),
  sync_rate float default 1.0,
  sync_updated_at bigint default 0,
  event_status text default 'waiting',
  host_layout text default 'pip',
  host_visible boolean default false,
  countdown_start bigint,
  countdown_duration integer default 900,
  curtains_open boolean default false,
  playback_id text,
  spotify_playlist_url text,
  updated_at timestamp with time zone default now()
);

-- ─── Conversation Cards + Interactive Moments ───
create table if not exists conversation_cards (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade,
  type text default 'card' check (type in ('card', 'quiz', 'poll', 'replay', 'teaser', 'reaction_prompt', 'this_or_that')),
  trigger_time_seconds integer not null,
  prompt_text text not null,
  options jsonb,
  response_type text default 'text' check (response_type in ('text', 'emoji_choice', 'multiple_choice', 'binary_choice')),
  auto_dismiss_seconds integer default 30,
  show_results boolean default false,
  is_active boolean default true,
  sort_order integer default 0
);

-- ─── Card Responses ───
create table if not exists card_responses (
  id uuid default uuid_generate_v4() primary key,
  card_id uuid references conversation_cards(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  viewer_id text not null,
  response_value text not null,
  responded_at timestamp with time zone default now()
);

-- ─── Chat Messages ───
create table if not exists chat_messages (
  id uuid default uuid_generate_v4() primary key,
  event_id text not null,
  viewer_id text not null,
  display_name text not null,
  text text not null,
  message_type text default 'chat' check (message_type in ('chat', 'reaction', 'milestone', 'system', 'highlight')),
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- ─── Activity Feed (unified stream) ───
create table if not exists activity_feed (
  id uuid default uuid_generate_v4() primary key,
  event_id text not null,
  type text not null check (type in ('chat', 'reaction', 'milestone', 'join', 'reaction_prompt', 'poll_result', 'this_or_that', 'word_cloud', 'highlight', 'system')),
  viewer_id text,
  display_name text,
  content text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- ─── Reactions (persistent for analytics) ───
create table if not exists reactions (
  id uuid default uuid_generate_v4() primary key,
  event_id text not null,
  viewer_id text not null,
  emoji text not null,
  video_timestamp float,
  created_at timestamp with time zone default now()
);

-- ─── Reaction Prompts (pre-marked moments in video) ───
create table if not exists reaction_prompts (
  id uuid default uuid_generate_v4() primary key,
  event_id text not null,
  trigger_time_seconds integer not null,
  prompt_text text not null default 'Did this resonate?',
  emoji_options jsonb default '["🔥","❤️","🤯","😂","👏"]'::jsonb,
  duration_seconds integer default 15,
  is_active boolean default true
);

-- ─── Reaction Prompt Responses ───
create table if not exists reaction_prompt_responses (
  id uuid default uuid_generate_v4() primary key,
  prompt_id uuid references reaction_prompts(id) on delete cascade,
  event_id text not null,
  viewer_id text not null,
  emoji text not null,
  responded_at timestamp with time zone default now()
);

-- ─── This or That Games ───
create table if not exists this_or_that (
  id uuid default uuid_generate_v4() primary key,
  event_id text not null,
  option_a text not null,
  option_b text not null,
  phase text default 'lobby' check (phase in ('lobby', 'afterparty')),
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

-- ─── This or That Votes ───
create table if not exists this_or_that_votes (
  id uuid default uuid_generate_v4() primary key,
  game_id uuid references this_or_that(id) on delete cascade,
  event_id text not null,
  viewer_id text not null,
  choice text not null check (choice in ('a', 'b')),
  voted_at timestamp with time zone default now(),
  unique(game_id, viewer_id)
);

-- ─── Viewer Profiles ───
create table if not exists viewer_profiles (
  id uuid default uuid_generate_v4() primary key,
  viewer_id text unique not null,
  display_name text,
  email text,
  location text,
  avatar_url text,
  registration_answers jsonb,      -- 0PD from pre-registration
  connection_room text,            -- assigned room name
  total_screenings integer default 0,
  total_reactions integer default 0,
  total_chat_messages integer default 0,
  total_breakout_minutes float default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ─── Badges / Collectibles ───
create table if not exists badges (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null,
  name text not null,
  description text,
  icon text,                       -- emoji or icon identifier
  category text default 'attendance' check (category in ('attendance', 'engagement', 'special', 'milestone')),
  created_at timestamp with time zone default now()
);

-- ─── Viewer Badges (earned collectibles) ───
create table if not exists viewer_badges (
  id uuid default uuid_generate_v4() primary key,
  viewer_id text not null,
  badge_id uuid references badges(id) on delete cascade,
  event_id text,
  earned_at timestamp with time zone default now(),
  unique(viewer_id, badge_id, event_id)
);

-- ─── Screening Receipts (DOAC Passport) ───
create table if not exists screening_receipts (
  id uuid default uuid_generate_v4() primary key,
  viewer_id text not null,
  event_id text not null,
  episode_title text,
  episode_number integer,
  viewer_count integer,
  connection_room text,
  join_time timestamp with time zone,
  leave_time timestamp with time zone,
  watch_duration_seconds integer,
  reaction_count integer default 0,
  chat_count integer default 0,
  breakout_duration_seconds integer default 0,
  badges_earned jsonb default '[]'::jsonb,
  takeaway_text text,              -- "What's the one thing you'll take away?"
  created_at timestamp with time zone default now(),
  unique(viewer_id, event_id)
);

-- ─── Viewer Questions (for host spotlight) ───
create table if not exists viewer_questions (
  id uuid default uuid_generate_v4() primary key,
  event_id text not null,
  viewer_id text not null,
  display_name text not null,
  question_text text not null,
  source text default 'registration' check (source in ('registration', 'live', 'chat')),
  is_featured boolean default false,
  is_answered boolean default false,
  upvotes integer default 0,
  created_at timestamp with time zone default now()
);

-- ─── Question Upvotes ───
create table if not exists question_upvotes (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references viewer_questions(id) on delete cascade,
  viewer_id text not null,
  created_at timestamp with time zone default now(),
  unique(question_id, viewer_id)
);

-- ─── Breakout Rooms ───
create table if not exists breakout_rooms (
  id uuid default uuid_generate_v4() primary key,
  event_id text not null,
  room_name text not null,
  livekit_room_name text,
  max_participants integer default 6,
  current_participants integer default 0,
  tags jsonb default '[]'::jsonb,   -- matching tags from registration
  phase text default 'lobby' check (phase in ('lobby', 'afterparty')),
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- ─── Breakout Room Participants ───
create table if not exists breakout_participants (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references breakout_rooms(id) on delete cascade,
  viewer_id text not null,
  display_name text,
  joined_at timestamp with time zone default now(),
  left_at timestamp with time zone,
  unique(room_id, viewer_id)
);

-- ─── Word Cloud Responses (afterparty) ───
create table if not exists word_cloud_responses (
  id uuid default uuid_generate_v4() primary key,
  event_id text not null,
  viewer_id text not null,
  response_text text not null,
  created_at timestamp with time zone default now()
);

-- ─── Engagement Tracking (silent, for future systems) ───
create table if not exists engagement_tracking (
  id uuid default uuid_generate_v4() primary key,
  event_id text not null,
  viewer_id text not null,
  metric_type text not null check (metric_type in ('join', 'leave', 'reaction', 'chat', 'card_response', 'breakout_join', 'breakout_leave', 'question_submit', 'question_upvote', 'this_or_that_vote', 'word_cloud', 'fullscreen')),
  metric_value text,
  video_timestamp float,
  created_at timestamp with time zone default now()
);

-- ─── Indexes ───
create index if not exists idx_cards_event on conversation_cards(event_id);
create index if not exists idx_cards_trigger on conversation_cards(trigger_time_seconds);
create index if not exists idx_card_responses_card on card_responses(card_id);
create index if not exists idx_card_responses_event on card_responses(event_id);
create index if not exists idx_chat_event on chat_messages(event_id);
create index if not exists idx_chat_created on chat_messages(created_at);
create index if not exists idx_activity_event on activity_feed(event_id);
create index if not exists idx_activity_created on activity_feed(created_at);
create index if not exists idx_activity_type on activity_feed(type);
create index if not exists idx_reactions_event on reactions(event_id);
create index if not exists idx_reactions_timestamp on reactions(video_timestamp);
create index if not exists idx_reaction_prompts_event on reaction_prompts(event_id);
create index if not exists idx_reaction_prompts_trigger on reaction_prompts(trigger_time_seconds);
create index if not exists idx_this_or_that_event on this_or_that(event_id);
create index if not exists idx_viewer_profiles_viewer on viewer_profiles(viewer_id);
create index if not exists idx_viewer_badges_viewer on viewer_badges(viewer_id);
create index if not exists idx_screening_receipts_viewer on screening_receipts(viewer_id);
create index if not exists idx_viewer_questions_event on viewer_questions(event_id);
create index if not exists idx_breakout_rooms_event on breakout_rooms(event_id);
create index if not exists idx_engagement_event on engagement_tracking(event_id);
create index if not exists idx_engagement_viewer on engagement_tracking(viewer_id);
create index if not exists idx_word_cloud_event on word_cloud_responses(event_id);

-- ─── Row Level Security ───
alter table events enable row level security;
alter table room_state enable row level security;
alter table conversation_cards enable row level security;
alter table card_responses enable row level security;
alter table chat_messages enable row level security;
alter table activity_feed enable row level security;
alter table reactions enable row level security;
alter table reaction_prompts enable row level security;
alter table reaction_prompt_responses enable row level security;
alter table this_or_that enable row level security;
alter table this_or_that_votes enable row level security;
alter table viewer_profiles enable row level security;
alter table badges enable row level security;
alter table viewer_badges enable row level security;
alter table screening_receipts enable row level security;
alter table viewer_questions enable row level security;
alter table question_upvotes enable row level security;
alter table breakout_rooms enable row level security;
alter table breakout_participants enable row level security;
alter table word_cloud_responses enable row level security;
alter table engagement_tracking enable row level security;

-- Public read policies
create policy "anon_read_events" on events for select using (true);
create policy "anon_read_room_state" on room_state for select using (true);
create policy "anon_read_cards" on conversation_cards for select using (true);
create policy "anon_read_chat" on chat_messages for select using (true);
create policy "anon_read_activity" on activity_feed for select using (true);
create policy "anon_read_reactions" on reactions for select using (true);
create policy "anon_read_reaction_prompts" on reaction_prompts for select using (true);
create policy "anon_read_this_or_that" on this_or_that for select using (true);
create policy "anon_read_badges" on badges for select using (true);
create policy "anon_read_viewer_badges" on viewer_badges for select using (true);
create policy "anon_read_questions" on viewer_questions for select using (true);
create policy "anon_read_breakout_rooms" on breakout_rooms for select using (true);

-- Public insert policies
create policy "anon_insert_responses" on card_responses for insert with check (true);
create policy "anon_insert_chat" on chat_messages for insert with check (true);
create policy "anon_insert_activity" on activity_feed for insert with check (true);
create policy "anon_insert_reactions" on reactions for insert with check (true);
create policy "anon_insert_prompt_responses" on reaction_prompt_responses for insert with check (true);
create policy "anon_insert_this_or_that_votes" on this_or_that_votes for insert with check (true);
create policy "anon_insert_questions" on viewer_questions for insert with check (true);
create policy "anon_insert_question_upvotes" on question_upvotes for insert with check (true);
create policy "anon_insert_word_cloud" on word_cloud_responses for insert with check (true);
create policy "anon_insert_engagement" on engagement_tracking for insert with check (true);
create policy "anon_insert_screening_receipts" on screening_receipts for insert with check (true);

-- Viewer profiles: read own, insert/update own
create policy "anon_read_own_profile" on viewer_profiles for select using (true);
create policy "anon_insert_profile" on viewer_profiles for insert with check (true);
create policy "anon_update_profile" on viewer_profiles for update using (true);

-- Screening receipts: read own
create policy "anon_read_receipts" on screening_receipts for select using (true);

-- Service role full access
create policy "service_events" on events for all using (auth.role() = 'service_role');
create policy "service_room_state" on room_state for all using (auth.role() = 'service_role');
create policy "service_cards" on conversation_cards for all using (auth.role() = 'service_role');
create policy "service_responses" on card_responses for all using (auth.role() = 'service_role');
create policy "service_chat" on chat_messages for all using (auth.role() = 'service_role');
create policy "service_activity" on activity_feed for all using (auth.role() = 'service_role');
create policy "service_reactions" on reactions for all using (auth.role() = 'service_role');
create policy "service_reaction_prompts" on reaction_prompts for all using (auth.role() = 'service_role');
create policy "service_prompt_responses" on reaction_prompt_responses for all using (auth.role() = 'service_role');
create policy "service_this_or_that" on this_or_that for all using (auth.role() = 'service_role');
create policy "service_this_or_that_votes" on this_or_that_votes for all using (auth.role() = 'service_role');
create policy "service_viewer_profiles" on viewer_profiles for all using (auth.role() = 'service_role');
create policy "service_badges" on badges for all using (auth.role() = 'service_role');
create policy "service_viewer_badges" on viewer_badges for all using (auth.role() = 'service_role');
create policy "service_screening_receipts" on screening_receipts for all using (auth.role() = 'service_role');
create policy "service_questions" on viewer_questions for all using (auth.role() = 'service_role');
create policy "service_question_upvotes" on question_upvotes for all using (auth.role() = 'service_role');
create policy "service_breakout_rooms" on breakout_rooms for all using (auth.role() = 'service_role');
create policy "service_breakout_participants" on breakout_participants for all using (auth.role() = 'service_role');
create policy "service_word_cloud" on word_cloud_responses for all using (auth.role() = 'service_role');
create policy "service_engagement" on engagement_tracking for all using (auth.role() = 'service_role');

-- Enable realtime for key tables
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table activity_feed;
alter publication supabase_realtime add table room_state;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table reaction_prompt_responses;
alter publication supabase_realtime add table this_or_that_votes;
alter publication supabase_realtime add table viewer_questions;

-- ─── Seed: Default Badges ───
insert into badges (slug, name, description, icon, category) values
  ('premiere', 'Premiere Viewer', 'Attended a premiere screening', '🎬', 'attendance'),
  ('connection-room', 'Connection Room', 'Joined a Connection Room breakout', '🤝', 'attendance'),
  ('early-bird', 'Early Bird', 'Arrived before the countdown started', '🐦', 'attendance'),
  ('stevens-table', 'Steven''s Table', 'Invited to Steven''s VIP breakout', '⭐', 'special'),
  ('first-reaction', 'First Reaction', 'Sent your first reaction', '🔥', 'engagement'),
  ('conversation-starter', 'Conversation Starter', 'Started a conversation in chat', '💬', 'engagement'),
  ('question-asker', 'Question Asker', 'Asked a question during the screening', '❓', 'engagement'),
  ('word-cloud', 'Word Cloud', 'Contributed to the afterparty word cloud', '☁️', 'engagement'),
  ('five-screenings', '5 Screenings', 'Attended 5 screenings', '🎯', 'milestone'),
  ('ten-screenings', '10 Screenings', 'Attended 10 screenings', '🏆', 'milestone')
on conflict (slug) do nothing;

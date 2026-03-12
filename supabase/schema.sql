-- Virtual Watch Party — Supabase Schema
-- Just the room. Nothing else.

create extension if not exists "uuid-ossp";

-- ─── Events ───
create table if not exists events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  mux_playback_id text,
  status text default 'waiting' check (status in ('waiting', 'live', 'ended')),
  created_at timestamp with time zone default now()
);

-- ─── Conversation Cards + Interactive Moments ───
create table if not exists conversation_cards (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade,
  type text default 'card' check (type in ('card', 'quiz', 'poll', 'replay', 'teaser')),
  trigger_time_seconds integer not null,
  prompt_text text not null,
  options jsonb,
  response_type text default 'text' check (response_type in ('text', 'emoji_choice', 'multiple_choice')),
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
  event_id uuid references events(id) on delete cascade,
  viewer_id text not null,
  display_name text not null,
  text text not null,
  created_at timestamp with time zone default now()
);

-- ─── Icebreaker Responses ───
create table if not exists icebreaker_responses (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade,
  viewer_id text not null,
  display_name text not null,
  prompt text not null,
  answer text not null,
  created_at timestamp with time zone default now()
);

-- ─── AI Matches ───
create table if not exists ai_matches (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade,
  viewer_id_1 text not null,
  viewer_id_2 text not null,
  match_reason text,
  created_at timestamp with time zone default now()
);

-- ─── Indexes ───
create index if not exists idx_cards_event on conversation_cards(event_id);
create index if not exists idx_cards_trigger on conversation_cards(trigger_time_seconds);
create index if not exists idx_card_responses_card on card_responses(card_id);
create index if not exists idx_card_responses_event on card_responses(event_id);
create index if not exists idx_chat_event on chat_messages(event_id);
create index if not exists idx_chat_created on chat_messages(created_at);
create index if not exists idx_icebreaker_event on icebreaker_responses(event_id);
create index if not exists idx_icebreaker_viewer on icebreaker_responses(viewer_id);
create index if not exists idx_matches_event on ai_matches(event_id);

-- ─── Row Level Security ───
alter table events enable row level security;
alter table conversation_cards enable row level security;
alter table card_responses enable row level security;
alter table chat_messages enable row level security;
alter table icebreaker_responses enable row level security;
alter table ai_matches enable row level security;

-- Public read for events, cards, chat
create policy "anon_read_events" on events for select using (true);
create policy "anon_read_cards" on conversation_cards for select using (true);
create policy "anon_read_chat" on chat_messages for select using (true);

-- Anon can insert responses, chat, icebreaker
create policy "anon_insert_responses" on card_responses for insert with check (true);
create policy "anon_insert_chat" on chat_messages for insert with check (true);
create policy "anon_read_icebreaker" on icebreaker_responses for select using (true);
create policy "anon_insert_icebreaker" on icebreaker_responses for insert with check (true);
create policy "anon_read_matches" on ai_matches for select using (true);

-- Service role full access
create policy "service_events" on events for all using (auth.role() = 'service_role');
create policy "service_cards" on conversation_cards for all using (auth.role() = 'service_role');
create policy "service_responses" on card_responses for all using (auth.role() = 'service_role');
create policy "service_chat" on chat_messages for all using (auth.role() = 'service_role');
create policy "service_icebreaker" on icebreaker_responses for all using (auth.role() = 'service_role');
create policy "service_matches" on ai_matches for all using (auth.role() = 'service_role');

-- Enable realtime for chat
alter publication supabase_realtime add table chat_messages;

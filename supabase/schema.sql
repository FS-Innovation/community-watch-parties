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

-- ─── Q&A Questions ───
create table if not exists qa_questions (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade,
  viewer_id text not null,
  display_name text not null,
  question_text text not null,
  upvote_count integer default 0,
  status text default 'visible' check (status in ('visible', 'selected', 'answered', 'hidden')),
  created_at timestamp with time zone default now()
);

-- ─── Q&A Upvotes ───
create table if not exists qa_upvotes (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references qa_questions(id) on delete cascade,
  viewer_id text not null,
  unique(question_id, viewer_id)
);

-- ─── Indexes ───
create index if not exists idx_cards_event on conversation_cards(event_id);
create index if not exists idx_cards_trigger on conversation_cards(trigger_time_seconds);
create index if not exists idx_card_responses_card on card_responses(card_id);
create index if not exists idx_card_responses_event on card_responses(event_id);
create index if not exists idx_qa_event on qa_questions(event_id);
create index if not exists idx_qa_upvotes on qa_questions(upvote_count desc);
create index if not exists idx_qa_status on qa_questions(status);
create index if not exists idx_upvotes_question on qa_upvotes(question_id);

-- ─── Row Level Security ───
alter table events enable row level security;
alter table conversation_cards enable row level security;
alter table card_responses enable row level security;
alter table qa_questions enable row level security;
alter table qa_upvotes enable row level security;

-- Public read for events, cards, questions
create policy "anon_read_events" on events for select using (true);
create policy "anon_read_cards" on conversation_cards for select using (true);
create policy "anon_read_qa" on qa_questions for select using (true);

-- Anon can insert responses, questions, upvotes
create policy "anon_insert_responses" on card_responses for insert with check (true);
create policy "anon_insert_qa" on qa_questions for insert with check (true);
create policy "anon_insert_upvotes" on qa_upvotes for insert with check (true);

-- Service role full access
create policy "service_events" on events for all using (auth.role() = 'service_role');
create policy "service_cards" on conversation_cards for all using (auth.role() = 'service_role');
create policy "service_responses" on card_responses for all using (auth.role() = 'service_role');
create policy "service_qa" on qa_questions for all using (auth.role() = 'service_role');
create policy "service_upvotes" on qa_upvotes for all using (auth.role() = 'service_role');

-- Enable realtime
alter publication supabase_realtime add table qa_questions;

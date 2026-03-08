-- DOAC Watch Party — Supabase Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 0PD: Registration table (Zero Party Data)
create table if not exists registrations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text unique not null,
  life_stage text not null,
  building text not null,
  question_for_steven text not null,
  location text not null,
  access_token uuid default uuid_generate_v4() unique not null,
  seat_number integer,
  role text default 'viewer' check (role in ('viewer', 'host')),
  created_at timestamp with time zone default now()
);

-- 1PD: Event interactions table (First Party Data)
create table if not exists event_interactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references registrations(id) on delete cascade,
  event_type text not null,
  payload jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- Leaderboard scores
create table if not exists leaderboard (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references registrations(id) on delete cascade unique,
  score integer default 0,
  updated_at timestamp with time zone default now()
);

-- Question submissions for Q&A
create table if not exists questions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references registrations(id) on delete cascade,
  question text not null,
  is_answered boolean default false,
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_registrations_email on registrations(email);
create index if not exists idx_registrations_token on registrations(access_token);
create index if not exists idx_event_interactions_user on event_interactions(user_id);
create index if not exists idx_event_interactions_type on event_interactions(event_type);
create index if not exists idx_leaderboard_score on leaderboard(score desc);

-- Enable Row Level Security
alter table registrations enable row level security;
alter table event_interactions enable row level security;
alter table leaderboard enable row level security;
alter table questions enable row level security;

-- Policies: Allow anon read for count, service role for writes
create policy "Allow anon to count registrations"
  on registrations for select
  using (true);

create policy "Allow service role full access to registrations"
  on registrations for all
  using (auth.role() = 'service_role');

create policy "Allow anon to read leaderboard"
  on leaderboard for select
  using (true);

create policy "Allow service role full access to leaderboard"
  on leaderboard for all
  using (auth.role() = 'service_role');

create policy "Allow service role full access to event_interactions"
  on event_interactions for all
  using (auth.role() = 'service_role');

create policy "Allow service role full access to questions"
  on questions for all
  using (auth.role() = 'service_role');

-- Enable realtime for registrations (for live counter)
alter publication supabase_realtime add table registrations;

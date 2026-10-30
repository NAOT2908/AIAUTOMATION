-- RoboCity: shared guestbook and leaderboards.
-- Run this once in the Supabase dashboard → SQL Editor, then put the project URL and the
-- anon key in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (see README).
-- The anon key is public by design; row-level security below is what protects the data:
-- visitors may read and add rows, never edit or delete them, and lengths are capped.

create table if not exists public.guestbook (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 24),
  emoji text not null default '👋' check (char_length(emoji) <= 8),
  message text not null check (char_length(message) between 1 and 140),
  created_at timestamptz not null default now()
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('mo', 'dj', 'pho', 'penalty')),
  name text not null check (char_length(name) between 1 and 24),
  score integer not null check (score between 1 and 10000000),
  created_at timestamptz not null default now()
);
create index if not exists scores_game_score on public.scores (game, score desc);

alter table public.guestbook enable row level security;
alter table public.scores enable row level security;

drop policy if exists "read guestbook" on public.guestbook;
drop policy if exists "sign guestbook" on public.guestbook;
create policy "read guestbook" on public.guestbook for select to anon using (true);
create policy "sign guestbook" on public.guestbook for insert to anon with check (true);

drop policy if exists "read scores" on public.scores;
drop policy if exists "add score" on public.scores;
create policy "read scores" on public.scores for select to anon using (true);
create policy "add score" on public.scores for insert to anon with check (true);

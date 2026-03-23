-- Godoj: Exercise sessions + new achievements
-- Run this in Supabase SQL Editor

create table public.exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  language text not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  total_exercises int not null default 0,
  correct_count int not null default 0,
  is_challenge boolean default false,
  created_at timestamptz default now()
);

alter table public.exercise_sessions enable row level security;

create policy "Users can read own sessions"
  on public.exercise_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions"
  on public.exercise_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions"
  on public.exercise_sessions for update using (auth.uid() = user_id);

create index idx_exercise_sessions_user on public.exercise_sessions(user_id);

-- New exercise achievements
insert into public.achievements values
  ('exercises_first', 'Pierwszy trening!', 'Ukończ pierwszą sesję ćwiczeń', '💪', 'milestones', 'bronze', 'exercise_sessions', 1),
  ('exercises_10', 'Regularny trening', '10 sesji ćwiczeń', '🏋️', 'milestones', 'bronze', 'exercise_sessions', 10),
  ('exercises_50', 'Ćwiczeniowy maniak', '50 sesji ćwiczeń', '🔥', 'milestones', 'silver', 'exercise_sessions', 50),
  ('exercises_streak_7', 'Tydzień treningów', '7 dni z rzędu z ćwiczeniami', '📅', 'streaks', 'silver', 'exercise_streak', 7),
  ('exercises_streak_30', 'Miesiąc treningów', '30 dni z rzędu z ćwiczeniami', '🗓️', 'streaks', 'gold', 'exercise_streak', 30),
  ('perfect_session', 'Bezbłędny!', 'Sesja bez błędów', '🎯', 'fluency', 'silver', 'perfect_session', 1),
  ('perfect_3', 'Trzy perfekcyjne', '3 bezbłędne sesje z rzędu', '🏆', 'fluency', 'gold', 'perfect_sessions_streak', 3),
  ('speed_demon', 'Błyskawica', 'Sesja w mniej niż 2 minuty', '⚡', 'explorer', 'silver', 'speed_session', 1),
  ('challenge_complete', 'Wyzwanie przyjęte', 'Ukończ sesję wyzwania', '🎖️', 'explorer', 'gold', 'challenge_session', 1),
  ('mastery_all', 'Wszystko opanowane', 'Wszystkie słowa na mastery >= 4', '👑', 'vocabulary', 'platinum', 'all_mastered', 1);

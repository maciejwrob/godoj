-- Godoj Phase 4: Kids mode, Admin, Multi-agent
-- Run in Supabase SQL Editor

-- Add max_daily_minutes to users
alter table public.users add column if not exists max_daily_minutes int default 30;

-- Add sample_text to agents_config
alter table public.agents_config add column if not exists sample_text text;

-- Usage tracking per day
create table public.usage_daily (
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  minutes_used decimal default 0,
  lessons_count int default 0,
  primary key (user_id, date)
);

alter table public.usage_daily enable row level security;

create policy "Users can read own usage"
  on public.usage_daily for select using (auth.uid() = user_id);
create policy "Admins can read all usage"
  on public.usage_daily for select using (public.is_admin());
create policy "System can upsert usage"
  on public.usage_daily for insert with check (auth.uid() = user_id);
create policy "System can update usage"
  on public.usage_daily for update using (auth.uid() = user_id);

-- Kids achievements
insert into public.achievements values
  ('kids_first_lesson', 'Pierwsza rozmowa! 🎉', 'Ukończ pierwszą lekcję', '🎉', 'milestones', 'bronze', 'lessons_count', 1),
  ('kids_streak_3', '3 dni z rzędu! 🔥', '3 dni nauki pod rząd', '🔥', 'streaks', 'bronze', 'streak_days', 3),
  ('kids_vocab_10', '10 nowych słówek! 📚', '10 słów w słowniczku', '📚', 'vocabulary', 'bronze', 'vocab_count', 10),
  ('kids_streak_7', 'Tydzień nauki! 🏆', '7 dni nauki pod rząd', '🏆', 'streaks', 'silver', 'streak_days', 7),
  ('kids_vocab_50', '50 słówek! 🌟', '50 słów w słowniczku', '🌟', 'vocabulary', 'silver', 'vocab_count', 50),
  ('kids_lessons_10', '10 rozmów! 💬', '10 lekcji ukończonych', '💬', 'milestones', 'silver', 'lessons_count', 10),
  ('kids_perfect', 'Bezbłędnie! ⭐', 'Ćwiczenia bez błędów', '⭐', 'fluency', 'gold', 'perfect_session', 1)
on conflict (id) do nothing;

-- Update sample_text for existing agent
update public.agents_config set sample_text = 'Hei, jeg heter Ingrid! Skal vi snakke norsk i dag?' where id = 'ingrid';

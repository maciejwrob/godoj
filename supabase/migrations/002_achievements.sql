-- Godoj: Achievements system
-- Run this in Supabase SQL Editor

-- Achievements definition table
create table public.achievements (
  id text primary key,
  name_pl text not null,
  description_pl text not null,
  icon text not null,
  category text not null check (category in ('milestones', 'streaks', 'vocabulary', 'fluency', 'explorer')),
  tier text not null check (tier in ('bronze', 'silver', 'gold', 'platinum')),
  requirement_type text not null,
  requirement_value int not null
);

-- User achievements (earned)
create table public.user_achievements (
  user_id uuid not null references public.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id),
  earned_at timestamptz default now(),
  primary key (user_id, achievement_id)
);

-- RLS
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy "Anyone can read achievements"
  on public.achievements for select
  using (true);

create policy "Users can read own achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

create policy "System can insert achievements"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

create policy "Admins can read all user achievements"
  on public.user_achievements for select
  using (public.is_admin());

-- Indexes
create index idx_user_achievements_user on public.user_achievements(user_id);
create index idx_vocabulary_user_lang on public.vocabulary(user_id, language);

-- ============================================
-- SEED DATA: All achievements
-- ============================================

-- MILESTONES
insert into public.achievements values
  ('first_lesson', 'Pierwsza rozmowa!', 'Ukończ swoją pierwszą lekcję', '🎉', 'milestones', 'bronze', 'lessons_count', 1),
  ('lessons_10', 'Rozmówca', 'Ukończ 10 lekcji', '💬', 'milestones', 'bronze', 'lessons_count', 10),
  ('lessons_25', 'Gadułka', 'Ukończ 25 lekcji', '🗣️', 'milestones', 'silver', 'lessons_count', 25),
  ('lessons_50', 'Poliglota w treningu', 'Ukończ 50 lekcji', '🌍', 'milestones', 'gold', 'lessons_count', 50),
  ('lessons_100', 'Mistrz konwersacji', 'Ukończ 100 lekcji', '👑', 'milestones', 'platinum', 'lessons_count', 100),
  ('minutes_60', 'Pierwsza godzina', '60 minut rozmów łącznie', '⏱️', 'milestones', 'bronze', 'total_minutes', 60),
  ('minutes_300', '5 godzin rozmów', '300 minut rozmów łącznie', '⏰', 'milestones', 'silver', 'total_minutes', 300),
  ('minutes_600', '10 godzin gadania', '600 minut rozmów łącznie', '🕐', 'milestones', 'gold', 'total_minutes', 600),
  ('minutes_1800', '30 godzin praktyki', '1800 minut rozmów łącznie', '🏆', 'milestones', 'platinum', 'total_minutes', 1800);

-- STREAKS
insert into public.achievements values
  ('streak_3', 'Dobry początek', '3 dni z rzędu', '🔥', 'streaks', 'bronze', 'streak_days', 3),
  ('streak_7', 'Tygodniowa seria', '7 dni z rzędu', '🔥', 'streaks', 'silver', 'streak_days', 7),
  ('streak_14', 'Dwa tygodnie non-stop', '14 dni z rzędu', '🔥', 'streaks', 'silver', 'streak_days', 14),
  ('streak_30', 'Miesięczna seria!', '30 dni z rzędu', '🔥', 'streaks', 'gold', 'streak_days', 30),
  ('streak_100', '100 dni z rzędu!', '100 dni nauki bez przerwy', '💎', 'streaks', 'platinum', 'streak_days', 100),
  ('weekly_goal_1', 'Cel osiągnięty!', 'Osiągnij cel tygodniowy', '✅', 'streaks', 'bronze', 'weekly_goals', 1),
  ('weekly_goal_4', 'Miesiąc celów', '4 tygodnie z osiągniętymi celami', '🎯', 'streaks', 'silver', 'weekly_goals', 4),
  ('weekly_goal_12', 'Kwartał doskonałości', '12 tygodni z celami', '🏅', 'streaks', 'gold', 'weekly_goals', 12);

-- VOCABULARY
insert into public.achievements values
  ('vocab_10', 'Pierwsze słówka', '10 słów w słowniczku', '📝', 'vocabulary', 'bronze', 'vocab_count', 10),
  ('vocab_50', 'Rosnący słownik', '50 słów w słowniczku', '📖', 'vocabulary', 'bronze', 'vocab_count', 50),
  ('vocab_100', 'Stówka!', '100 słów w słowniczku', '📚', 'vocabulary', 'silver', 'vocab_count', 100),
  ('vocab_250', 'Bogaty słownik', '250 słów w słowniczku', '📕', 'vocabulary', 'silver', 'vocab_count', 250),
  ('vocab_500', 'Językowy skarbiec', '500 słów w słowniczku', '💰', 'vocabulary', 'gold', 'vocab_count', 500),
  ('vocab_1000', 'Tysiąc słów!', '1000 słów w słowniczku', '🏛️', 'vocabulary', 'platinum', 'vocab_count', 1000),
  ('mastery_10', '10 opanowanych', '10 słów z mastery >= 4', '✨', 'vocabulary', 'bronze', 'mastery_count', 10),
  ('mastery_50', '50 na blachę', '50 opanowanych słów', '💫', 'vocabulary', 'silver', 'mastery_count', 50),
  ('mastery_100', 'Mistrz słówek', '100 opanowanych słów', '🌟', 'vocabulary', 'gold', 'mastery_count', 100),
  ('new_words_lesson_10', 'Gąbka!', '10+ nowych słów w jednej lekcji', '🧽', 'vocabulary', 'silver', 'words_per_lesson', 10);

-- FLUENCY
insert into public.achievements values
  ('fluency_3', 'Się rozkręcam', 'Fluency score >= 3.0', '📈', 'fluency', 'bronze', 'fluency_score', 3),
  ('fluency_4', 'Płynnie!', 'Fluency score >= 4.0', '🚀', 'fluency', 'silver', 'fluency_score', 4),
  ('fluency_5', 'Perfekcja', 'Fluency score = 5.0', '💎', 'fluency', 'gold', 'fluency_score', 5),
  ('fluency_4_streak_3', 'Stała forma', '3 lekcje z rzędu z fluency >= 4.0', '🏋️', 'fluency', 'gold', 'fluency_streak', 3),
  ('level_up', 'Awans!', 'Pierwszy awans poziomu', '⬆️', 'fluency', 'silver', 'level_ups', 1),
  ('level_b1', 'Próg B1', 'Osiągnięcie poziomu B1', '🎓', 'fluency', 'gold', 'level_reached', 3),
  ('level_b2', 'Zaawansowany', 'Osiągnięcie poziomu B2', '🎓', 'fluency', 'gold', 'level_reached', 4),
  ('level_c1', 'Biegłość', 'Osiągnięcie poziomu C1', '👨‍🎓', 'fluency', 'platinum', 'level_reached', 5);

-- EXPLORER
insert into public.achievements values
  ('topics_5', 'Odkrywca tematów', '5 różnych tematów lekcji', '🧭', 'explorer', 'bronze', 'unique_topics', 5),
  ('topics_15', 'Wszechstronny', '15 różnych tematów', '🗺️', 'explorer', 'silver', 'unique_topics', 15),
  ('topics_30', 'Encyklopedysta', '30 różnych tematów', '📰', 'explorer', 'gold', 'unique_topics', 30),
  ('long_lesson', 'Maratończyk', 'Lekcja trwająca 25+ minut', '🏃', 'explorer', 'silver', 'lesson_duration', 1500),
  ('short_lesson', 'Szybki strzał', 'Ukończ lekcję w 5 minut', '⚡', 'explorer', 'bronze', 'short_lesson', 1),
  ('comeback', 'Powrót!', 'Lekcja po 7+ dniach przerwy', '🔄', 'explorer', 'bronze', 'comeback_days', 7),
  ('night_owl', 'Nocny marek', 'Lekcja po 22:00', '🦉', 'explorer', 'bronze', 'night_lesson', 1),
  ('early_bird', 'Ranny ptaszek', 'Lekcja przed 7:00', '🐦', 'explorer', 'bronze', 'early_lesson', 1),
  ('weekend_warrior', 'Weekendowy wojownik', 'Lekcje w sobotę i niedzielę', '⚔️', 'explorer', 'bronze', 'weekend_lessons', 1);

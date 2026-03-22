-- Godoj: Initial database schema
-- Run this in Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Users (extends auth.users)
create table public.users (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role text not null default 'adult' check (role in ('admin', 'adult', 'child')),
  parent_id uuid references public.users(id),
  native_language text default 'pl',
  is_active boolean default true,
  invited_by uuid references public.users(id),
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

-- User profiles (learning preferences, one per user per language)
create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_language text not null,
  language_variant text,
  current_level text default 'A1',
  learning_goals jsonb default '[]'::jsonb,
  interests jsonb default '[]'::jsonb,
  preferred_duration_min int default 15,
  preferred_frequency text default '3-4x',
  preferred_time text default 'any',
  reminders_enabled boolean default false,
  selected_agent_id text,
  is_kids_mode boolean default false,
  created_at timestamptz default now(),
  unique (user_id, target_language)
);

-- Lessons
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  language text not null,
  agent_id text not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds int,
  topic text,
  level_at_start text not null,
  level_at_end text,
  fluency_score decimal(2,1),
  summary_json jsonb,
  transcript text,
  elevenlabs_session_id text
);

-- Vocabulary
create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  language text not null,
  word text not null,
  translation text not null,
  context_sentence text,
  lesson_id uuid references public.lessons(id) on delete set null,
  times_used int default 1,
  mastery_level int default 0,
  last_seen_at timestamptz default now(),
  pronunciation_url text,
  created_at timestamptz default now()
);

-- Streaks
create table public.streaks (
  user_id uuid primary key references public.users(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_lesson_date date,
  weekly_minutes_goal int default 30,
  weekly_minutes_done int default 0,
  week_start date
);

-- Invitations
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  invited_by uuid not null references public.users(id),
  token text unique default gen_random_uuid()::text,
  role text default 'adult',
  parent_id uuid,
  accepted_at timestamptz,
  expires_at timestamptz default now() + interval '7 days',
  created_at timestamptz default now()
);

-- Agents configuration
create table public.agents_config (
  id text primary key,
  elevenlabs_agent_id text not null,
  language text not null,
  variant text,
  audience text not null check (audience in ('adult', 'kids')),
  voice_name text not null,
  voice_description text,
  voice_sample_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.vocabulary enable row level security;
alter table public.streaks enable row level security;
alter table public.invitations enable row level security;
alter table public.agents_config enable row level security;

-- Helper: check if user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- USERS policies
create policy "Users can read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "Admins can read all users"
  on public.users for select
  using (public.is_admin());

create policy "Users can update own row"
  on public.users for update
  using (auth.uid() = id);

-- USER_PROFILES policies
create policy "Users can read own profiles"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profiles"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profiles"
  on public.user_profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete own profiles"
  on public.user_profiles for delete
  using (auth.uid() = user_id);

create policy "Admins can read all profiles"
  on public.user_profiles for select
  using (public.is_admin());

-- LESSONS policies
create policy "Users can read own lessons"
  on public.lessons for select
  using (auth.uid() = user_id);

create policy "Users can insert own lessons"
  on public.lessons for insert
  with check (auth.uid() = user_id);

create policy "Users can update own lessons"
  on public.lessons for update
  using (auth.uid() = user_id);

create policy "Admins can read all lessons"
  on public.lessons for select
  using (public.is_admin());

-- VOCABULARY policies
create policy "Users can read own vocabulary"
  on public.vocabulary for select
  using (auth.uid() = user_id);

create policy "Users can insert own vocabulary"
  on public.vocabulary for insert
  with check (auth.uid() = user_id);

create policy "Users can update own vocabulary"
  on public.vocabulary for update
  using (auth.uid() = user_id);

create policy "Users can delete own vocabulary"
  on public.vocabulary for delete
  using (auth.uid() = user_id);

-- STREAKS policies
create policy "Users can read own streaks"
  on public.streaks for select
  using (auth.uid() = user_id);

create policy "Admins can read all streaks"
  on public.streaks for select
  using (public.is_admin());

-- INVITATIONS policies (admin only)
create policy "Admins can read invitations"
  on public.invitations for select
  using (public.is_admin());

create policy "Admins can insert invitations"
  on public.invitations for insert
  with check (public.is_admin());

create policy "Admins can update invitations"
  on public.invitations for update
  using (public.is_admin());

create policy "Admins can delete invitations"
  on public.invitations for delete
  using (public.is_admin());

-- AGENTS_CONFIG policies
create policy "Authenticated users can read active agents"
  on public.agents_config for select
  using (auth.role() = 'authenticated' and is_active = true);

create policy "Admins can manage agents"
  on public.agents_config for all
  using (public.is_admin());

-- ============================================
-- TRIGGER: Auto-create user row on auth signup
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 020: email drip tracking, app analytics, auth/IP events, tutor gender,
--      one-click trial extension token, post-lesson personalized topics

-- Drip email tracking — one row per user per email key (dedupe)
CREATE TABLE IF NOT EXISTS public.drip_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_key text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  UNIQUE (user_id, email_key)
);
ALTER TABLE public.drip_emails ENABLE ROW LEVEL SECURITY;

-- App analytics events (insert via server route with service role; admin-only read)
CREATE TABLE IF NOT EXISTS public.app_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  properties jsonb DEFAULT '{}'::jsonb,
  path text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_events_user_time ON public.app_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_event_time ON public.app_events (event, created_at DESC);
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Auth events: IP + geo captured at every login (first row = registration IP)
CREATE TABLE IF NOT EXISTS public.auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ip text,
  country text,
  city text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_events_user ON public.auth_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_ip ON public.auth_events (ip);
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- Tutor gender — onboarding voice choice (existing agents are female)
ALTER TABLE public.agents_config
  ADD COLUMN IF NOT EXISTS gender text DEFAULT 'female' CHECK (gender IN ('female', 'male'));

-- One-click trial extension from the goodbye email
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trial_extension_token uuid DEFAULT gen_random_uuid();

-- Post-lesson personalized topics (the topic engine)
CREATE TABLE IF NOT EXISTS public.user_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  language text NOT NULL,
  topic text NOT NULL,
  source text NOT NULL DEFAULT 'post_lesson',
  origin_lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_user_topics_pick ON public.user_topics (user_id, language, used_at, created_at);
ALTER TABLE public.user_topics ENABLE ROW LEVEL SECURITY;

-- App config for editable settings (e.g. system prompt)
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage config"
  ON public.app_config FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can read config"
  ON public.app_config FOR SELECT USING (auth.role() = 'authenticated');

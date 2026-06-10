-- SECURITY HARDENING (pre-launch audit findings)

-- C1: Privilege escalation — "Users can update own row" policy had no column
-- restriction, so any authenticated user could set role='admin' via PostgREST
-- with the public anon key. Restrict UPDATE to safe profile columns only.
-- (Admin mutations go through the service-role client and are unaffected.)
REVOKE UPDATE ON public.users FROM authenticated;
REVOKE UPDATE ON public.users FROM anon;
GRANT UPDATE (display_name, native_language, ui_language, onboarding_complete)
  ON public.users TO authenticated;

-- Defense in depth: explicit WITH CHECK on the update policy
DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- C2: waitlist + magic_link_events were created without RLS — fully readable
-- and writable with the public anon key (all-user emails/PII). These tables
-- are only accessed via the service-role client, so RLS with no policies.
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_link_events ENABLE ROW LEVEL SECURITY;

-- PERFORMANCE: lessons is filtered by (user_id, language) + ordered by
-- started_at in every hot path (start, end, dashboard, progress) and had no index.
CREATE INDEX IF NOT EXISTS idx_lessons_user_lang_started
  ON public.lessons (user_id, language, started_at DESC);

-- DATA INTEGRITY: vocabulary had no uniqueness, so the insert-then-update
-- dedup logic in lessons/end never fired and duplicates accumulated
-- (inflating dashboard counts and vocab achievements). Dedupe keeping the
-- oldest row, then enforce uniqueness.
DELETE FROM public.vocabulary a
USING public.vocabulary b
WHERE a.user_id = b.user_id
  AND a.language = b.language
  AND lower(a.word) = lower(b.word)
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_user_lang_word
  ON public.vocabulary (user_id, language, lower(word));

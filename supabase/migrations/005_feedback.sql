-- Godoj: Feedback module
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  transcript TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own feedback"
  ON public.feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all feedback"
  ON public.feedback FOR SELECT USING (public.is_admin());

CREATE INDEX idx_feedback_user ON public.feedback(user_id);
CREATE INDEX idx_feedback_lesson ON public.feedback(lesson_id);

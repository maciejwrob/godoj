-- Tabela profili dzieci (sub-konta rodzica)
CREATE TABLE child_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  theme TEXT NOT NULL DEFAULT 'jungle' CHECK (theme IN ('castle', 'jungle', 'space')),
  target_language TEXT NOT NULL,
  pin_code TEXT NOT NULL,  -- hashed SHA-256
  daily_time_limit_min INTEGER DEFAULT NULL,  -- null = bez limitu
  avatar_id TEXT DEFAULT 'default_1',
  stars_total INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Max 5 dzieci na rodzica
CREATE INDEX idx_child_profiles_parent ON child_profiles(parent_id);

-- RLS: rodzic widzi tylko swoje dzieci
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own children" ON child_profiles
  FOR ALL USING (parent_id = auth.uid());

-- Tabela lekcji dziecięcych
CREATE TABLE child_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id),
  language TEXT NOT NULL,
  agent_id TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  stars_earned INTEGER DEFAULT 0,
  topic TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE child_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage child lessons" ON child_lessons
  FOR ALL USING (parent_id = auth.uid());

-- Tabela słownictwa dziecięcego
CREATE TABLE child_vocabulary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  language TEXT NOT NULL,
  image_url TEXT,
  mastery_level INTEGER DEFAULT 0,
  times_practiced INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE child_vocabulary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage child vocabulary" ON child_vocabulary
  FOR ALL USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- Kolekcjonowane postacie/zwierzątka
CREATE TABLE child_collectibles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  collectible_type TEXT NOT NULL CHECK (collectible_type IN ('animal', 'character', 'trophy')),
  collectible_id TEXT NOT NULL,
  evolution_stage INTEGER DEFAULT 1 CHECK (evolution_stage BETWEEN 1 AND 3),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, collectible_id)
);

ALTER TABLE child_collectibles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage child collectibles" ON child_collectibles
  FOR ALL USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- Dodaj age_group do agents_config (jeśli kolumna nie istnieje)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents_config' AND column_name = 'age_group') THEN
    ALTER TABLE agents_config ADD COLUMN age_group TEXT;
  END IF;
END $$;

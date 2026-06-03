-- XP-based level progression system
-- Prevents too-fast level jumps by requiring XP accumulation + consistent Claude recommendations

-- Add XP tracking to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS xp_current integer DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS xp_total integer DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS level_confirmed_at timestamptz;

-- Track per-lesson XP and level recommendations
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS xp_earned integer DEFAULT 0;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS level_recommended text;

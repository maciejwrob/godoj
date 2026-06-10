-- Remove achievements that can never be earned after the exercises module was removed:
-- * exercises_* / perfect_* / speed_demon / challenge_complete — tracked via exercise_sessions
-- * mastery_* — mastery_level only increased through exercises (no SRS without it)
-- * weekly_goal_4 / weekly_goal_12 — no weekly-goal history tracking (weekly_goal_1 is now implemented)
-- Kids badges are kept (kids module is hidden, filtered out for adults by id prefix).

DELETE FROM public.user_achievements WHERE achievement_id IN (
  'exercises_first', 'exercises_10', 'exercises_50',
  'exercises_streak_7', 'exercises_streak_30',
  'perfect_session', 'perfect_3', 'speed_demon', 'challenge_complete',
  'mastery_all', 'mastery_10', 'mastery_50', 'mastery_100',
  'weekly_goal_4', 'weekly_goal_12'
);

DELETE FROM public.achievements WHERE id IN (
  'exercises_first', 'exercises_10', 'exercises_50',
  'exercises_streak_7', 'exercises_streak_30',
  'perfect_session', 'perfect_3', 'speed_demon', 'challenge_complete',
  'mastery_all', 'mastery_10', 'mastery_50', 'mastery_100',
  'weekly_goal_4', 'weekly_goal_12'
);

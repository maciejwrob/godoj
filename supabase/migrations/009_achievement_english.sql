-- Add English name and description columns to achievements
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS description_en text;

-- MILESTONES
UPDATE public.achievements SET name_en = 'First Conversation!', description_en = 'Complete your first lesson' WHERE id = 'first_lesson';
UPDATE public.achievements SET name_en = 'Conversationalist', description_en = 'Complete 10 lessons' WHERE id = 'lessons_10';
UPDATE public.achievements SET name_en = 'Chatterbox', description_en = 'Complete 25 lessons' WHERE id = 'lessons_25';
UPDATE public.achievements SET name_en = 'Polyglot in Training', description_en = 'Complete 50 lessons' WHERE id = 'lessons_50';
UPDATE public.achievements SET name_en = 'Conversation Master', description_en = 'Complete 100 lessons' WHERE id = 'lessons_100';
UPDATE public.achievements SET name_en = 'First Hour', description_en = '60 minutes of conversations total' WHERE id = 'minutes_60';
UPDATE public.achievements SET name_en = '5 Hours of Talking', description_en = '300 minutes of conversations total' WHERE id = 'minutes_300';
UPDATE public.achievements SET name_en = '10 Hours of Chat', description_en = '600 minutes of conversations total' WHERE id = 'minutes_600';
UPDATE public.achievements SET name_en = '30 Hours of Practice', description_en = '1800 minutes of conversations total' WHERE id = 'minutes_1800';

-- STREAKS
UPDATE public.achievements SET name_en = 'Good Start', description_en = '3 days in a row' WHERE id = 'streak_3';
UPDATE public.achievements SET name_en = 'Weekly Streak', description_en = '7 days in a row' WHERE id = 'streak_7';
UPDATE public.achievements SET name_en = 'Two Weeks Non-Stop', description_en = '14 days in a row' WHERE id = 'streak_14';
UPDATE public.achievements SET name_en = 'Monthly Streak!', description_en = '30 days in a row' WHERE id = 'streak_30';
UPDATE public.achievements SET name_en = '100 Days Running!', description_en = '100 days of learning without a break' WHERE id = 'streak_100';
UPDATE public.achievements SET name_en = 'Goal Achieved!', description_en = 'Hit your weekly goal' WHERE id = 'weekly_goal_1';
UPDATE public.achievements SET name_en = 'Month of Goals', description_en = '4 weeks of hitting weekly goals' WHERE id = 'weekly_goal_4';
UPDATE public.achievements SET name_en = 'Quarter of Excellence', description_en = '12 weeks of hitting goals' WHERE id = 'weekly_goal_12';

-- VOCABULARY
UPDATE public.achievements SET name_en = 'First Words', description_en = '10 words in your vocabulary' WHERE id = 'vocab_10';
UPDATE public.achievements SET name_en = 'Growing Dictionary', description_en = '50 words in your vocabulary' WHERE id = 'vocab_50';
UPDATE public.achievements SET name_en = 'A Hundred!', description_en = '100 words in your vocabulary' WHERE id = 'vocab_100';
UPDATE public.achievements SET name_en = 'Rich Vocabulary', description_en = '250 words in your vocabulary' WHERE id = 'vocab_250';
UPDATE public.achievements SET name_en = 'Word Vault', description_en = '500 words in your vocabulary' WHERE id = 'vocab_500';
UPDATE public.achievements SET name_en = 'A Thousand Words!', description_en = '1000 words in your vocabulary' WHERE id = 'vocab_1000';
UPDATE public.achievements SET name_en = '10 Mastered', description_en = '10 words with mastery >= 4' WHERE id = 'mastery_10';
UPDATE public.achievements SET name_en = '50 Down Cold', description_en = '50 mastered words' WHERE id = 'mastery_50';
UPDATE public.achievements SET name_en = 'Word Master', description_en = '100 mastered words' WHERE id = 'mastery_100';
UPDATE public.achievements SET name_en = 'Sponge!', description_en = '10+ new words in one lesson' WHERE id = 'new_words_lesson_10';
UPDATE public.achievements SET name_en = 'All Mastered', description_en = 'All words at mastery >= 4' WHERE id = 'mastery_all';

-- FLUENCY
UPDATE public.achievements SET name_en = 'Warming Up', description_en = 'Fluency score >= 3.0' WHERE id = 'fluency_3';
UPDATE public.achievements SET name_en = 'Flowing!', description_en = 'Fluency score >= 4.0' WHERE id = 'fluency_4';
UPDATE public.achievements SET name_en = 'Perfection', description_en = 'Fluency score = 5.0' WHERE id = 'fluency_5';
UPDATE public.achievements SET name_en = 'Consistent Form', description_en = '3 lessons in a row with fluency >= 4.0' WHERE id = 'fluency_4_streak_3';
UPDATE public.achievements SET name_en = 'Level Up!', description_en = 'First level promotion' WHERE id = 'level_up';
UPDATE public.achievements SET name_en = 'B1 Threshold', description_en = 'Reached level B1' WHERE id = 'level_b1';
UPDATE public.achievements SET name_en = 'Advanced', description_en = 'Reached level B2' WHERE id = 'level_b2';
UPDATE public.achievements SET name_en = 'Proficiency', description_en = 'Reached level C1' WHERE id = 'level_c1';

-- EXPLORER
UPDATE public.achievements SET name_en = 'Topic Explorer', description_en = '5 different lesson topics' WHERE id = 'topics_5';
UPDATE public.achievements SET name_en = 'Well-Rounded', description_en = '15 different topics' WHERE id = 'topics_15';
UPDATE public.achievements SET name_en = 'Encyclopedist', description_en = '30 different topics' WHERE id = 'topics_30';
UPDATE public.achievements SET name_en = 'Marathon Runner', description_en = 'Lesson lasting 25+ minutes' WHERE id = 'long_lesson';
UPDATE public.achievements SET name_en = 'Quick Shot', description_en = 'Finish a lesson in 5 minutes' WHERE id = 'short_lesson';
UPDATE public.achievements SET name_en = 'Comeback!', description_en = 'Lesson after 7+ days off' WHERE id = 'comeback';
UPDATE public.achievements SET name_en = 'Night Owl', description_en = 'Lesson after 10 PM' WHERE id = 'night_owl';
UPDATE public.achievements SET name_en = 'Early Bird', description_en = 'Lesson before 7 AM' WHERE id = 'early_bird';
UPDATE public.achievements SET name_en = 'Weekend Warrior', description_en = 'Lessons on Saturday and Sunday' WHERE id = 'weekend_warrior';

-- EXERCISE BADGES
UPDATE public.achievements SET name_en = 'First Workout!', description_en = 'Complete your first exercise session' WHERE id = 'exercises_first';
UPDATE public.achievements SET name_en = 'Regular Training', description_en = '10 exercise sessions' WHERE id = 'exercises_10';
UPDATE public.achievements SET name_en = 'Exercise Addict', description_en = '50 exercise sessions' WHERE id = 'exercises_50';
UPDATE public.achievements SET name_en = 'Week of Workouts', description_en = '7 days of exercises in a row' WHERE id = 'exercises_streak_7';
UPDATE public.achievements SET name_en = 'Month of Workouts', description_en = '30 days of exercises in a row' WHERE id = 'exercises_streak_30';
UPDATE public.achievements SET name_en = 'Flawless!', description_en = 'Session without mistakes' WHERE id = 'perfect_session';
UPDATE public.achievements SET name_en = 'Three Perfect', description_en = '3 flawless sessions in a row' WHERE id = 'perfect_3';
UPDATE public.achievements SET name_en = 'Lightning', description_en = 'Session in under 2 minutes' WHERE id = 'speed_demon';
UPDATE public.achievements SET name_en = 'Challenge Accepted', description_en = 'Complete a challenge session' WHERE id = 'challenge_complete';

-- KIDS BADGES
UPDATE public.achievements SET name_en = 'First Conversation!', description_en = 'Complete your first lesson' WHERE id = 'kids_first_lesson';
UPDATE public.achievements SET name_en = '3 Days in a Row!', description_en = '3 days of learning in a row' WHERE id = 'kids_streak_3';
UPDATE public.achievements SET name_en = '10 New Words!', description_en = '10 words in your vocabulary' WHERE id = 'kids_vocab_10';
UPDATE public.achievements SET name_en = 'Week of Learning!', description_en = '7 days of learning in a row' WHERE id = 'kids_streak_7';
UPDATE public.achievements SET name_en = '50 Words!', description_en = '50 words in your vocabulary' WHERE id = 'kids_vocab_50';
UPDATE public.achievements SET name_en = '10 Conversations!', description_en = '10 lessons completed' WHERE id = 'kids_lessons_10';
UPDATE public.achievements SET name_en = 'Flawless!', description_en = 'Exercises without mistakes' WHERE id = 'kids_perfect';

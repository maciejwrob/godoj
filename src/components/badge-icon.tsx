import Image from "next/image";

// All achievement IDs that have custom badge images
const BADGE_IMAGES: Set<string> = new Set([
  // Milestones
  "first_lesson", "lessons_10", "lessons_25", "lessons_50", "lessons_100",
  "minutes_60", "minutes_300", "minutes_600", "minutes_1800",
  // Streaks
  "streak_3", "streak_7", "streak_14", "streak_30", "streak_100",
  "weekly_goal_1", "weekly_goal_4", "weekly_goal_12",
  // Vocabulary
  "vocab_10", "vocab_50", "vocab_100", "vocab_250", "vocab_500", "vocab_1000",
  "mastery_10", "mastery_50", "mastery_100", "mastery_all",
  "new_words_lesson_10",
  // Fluency
  "fluency_3", "fluency_4", "fluency_5", "fluency_4_streak_3",
  "level_up", "level_b1", "level_b2", "level_c1",
  // Explorer
  "topics_5", "topics_15", "topics_30",
  "long_lesson", "short_lesson", "comeback",
  "night_owl", "early_bird", "weekend_warrior",
  // Exercises
  "exercises_first", "exercises_10", "exercises_50",
  "exercises_streak_7", "exercises_streak_30",
  "perfect_session", "perfect_3", "speed_demon", "challenge_complete",
]);

export function BadgeIcon({
  achievementId,
  emoji,
  size = 48,
  earned = false,
}: {
  achievementId: string;
  emoji: string;
  size?: number;
  earned?: boolean;
}) {
  const hasImage = BADGE_IMAGES.has(achievementId);

  if (hasImage) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-full ${
          earned ? "shadow-lg shadow-primary/20" : "grayscale opacity-50"
        }`}
        style={{ width: size, height: size }}
      >
        <Image
          src={`/badges/${achievementId}.jpg`}
          alt={achievementId}
          width={size * 2}
          height={size * 2}
          className="h-full w-full object-cover"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  }

  // Fallback: emoji in a styled circle
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${
        earned
          ? "bg-surface-container-high shadow-lg"
          : "bg-surface-container-high/50 grayscale opacity-50"
      }`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {emoji}
    </div>
  );
}

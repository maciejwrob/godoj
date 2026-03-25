import Image from "next/image";

// Map of achievement IDs that have custom badge images
const BADGE_IMAGES: Set<string> = new Set([
  "weekend_warrior",
  "exercises_first",
  "exercises_10",
  "mastery_100",
  "streak_7",
  "level_b1",
  "perfect_session",
  "perfect_3",
  "speed_demon",
  "challenge_complete",
  "vocab_1000",
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

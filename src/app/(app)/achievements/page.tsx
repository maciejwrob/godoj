import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { BadgeIcon } from "@/components/badge-icon";
import { getTranslations, resolveLocale } from "@/lib/i18n-data";

type Achievement = {
  id: string;
  name_pl: string;
  description_pl: string;
  icon: string;
  category: string;
  tier: string;
  requirement_type: string;
  requirement_value: number;
};

type UserAchievement = {
  achievement_id: string;
  earned_at: string;
};

// Category labels are resolved dynamically with translations below

const TIER_COLORS: Record<string, string> = {
  bronze: "from-amber-700 to-amber-600",
  silver: "from-gray-400 to-gray-300",
  gold: "from-yellow-500 to-yellow-400",
  platinum: "from-cyan-400 to-blue-400",
};

const TIER_BORDER: Record<string, string> = {
  bronze: "border-amber-700/30",
  silver: "border-gray-400/30",
  gold: "border-yellow-500/30",
  platinum: "border-cyan-400/30",
};

export default async function AchievementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: allAchievements }, { data: userAchievements }, { data: profileData }, { data: userData }] = await Promise.all([
    supabase.from("achievements").select("*").order("category").order("requirement_value"),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", user.id),
    supabase.from("user_profiles").select("is_kids_mode").eq("user_id", user.id).limit(1).single(),
    supabase.from("users").select("native_language").eq("id", user.id).single(),
  ]);

  const t = getTranslations(resolveLocale(userData?.native_language));
  const isKids = profileData?.is_kids_mode ?? false;
  // Filter: show only kids badges for kids, only adult badges for adults
  const achievements = ((allAchievements ?? []) as Achievement[]).filter(
    (a) => isKids ? a.id.startsWith("kids_") : !a.id.startsWith("kids_")
  );
  const earned = new Map((userAchievements ?? [] as UserAchievement[]).map((ua: UserAchievement) => [ua.achievement_id, ua.earned_at]));
  const earnedCount = achievements.filter((a) => earned.has(a.id)).length;
  const totalCount = achievements.length;

  const CATEGORY_LABELS: Record<string, string> = {
    milestones: t.milestones,
    streaks: t.streaksCategory,
    vocabulary: t.vocabularyCategory,
    fluency: t.fluencyCategory,
    explorer: t.explorerCategory,
  };
  const categories = [...new Set(achievements.map((a) => a.category))];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Trophy className="h-6 w-6 text-yellow-400" />
            {t.achievementsTitle}
          </h1>
          <p className="mt-1 text-text-secondary">
            {earnedCount}/{totalCount} {t.achieved}
          </p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
          <span className="text-2xl font-bold text-yellow-400">{earnedCount}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8 h-3 w-full rounded-full bg-bg-card">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all"
          style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
        />
      </div>

      {categories.map((cat) => {
        const catAchievements = achievements.filter((a) => a.category === cat);
        return (
          <div key={cat} className="mb-8">
            <h2 className="mb-4 text-lg font-bold">{CATEGORY_LABELS[cat] ?? cat}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catAchievements.map((a) => {
                const isEarned = earned.has(a.id);
                const earnedAt = earned.get(a.id);
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-4 transition-all ${
                      isEarned
                        ? `${TIER_BORDER[a.tier]} bg-bg-card`
                        : "border-border/30 bg-bg-card/50 opacity-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <BadgeIcon achievementId={a.id} emoji={a.icon} size={64} earned={isEarned} />
                      <div className="flex-1">
                        <div className="font-medium">{a.name_pl}</div>
                        <div className="text-sm text-text-secondary">{a.description_pl}</div>
                        {isEarned && earnedAt && (
                          <div className="mt-1 text-xs text-primary">
                            {t.earnedAt} {new Date(earnedAt).toLocaleDateString("pl-PL")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KIDS_THEME, kidsFluencyLabel } from "@/lib/kids";

interface DashboardData {
  displayName: string;
  currentStreak: number;
  recentAchievements: Array<{
    achievement_id: string;
    earned_at: string;
    icon: string;
    name_pl: string;
  }>;
  lastFluencyScore: number | null;
}

export default function KidsDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [{ data: userData }, { data: streak }, { data: achievements }, { data: recentLesson }] =
        await Promise.all([
          supabase.from("users").select("display_name").eq("id", user.id).single(),
          supabase.from("streaks").select("current_streak").eq("user_id", user.id).single(),
          supabase.from("user_achievements").select("achievement_id, earned_at, achievements(name_pl, icon)").eq("user_id", user.id).order("earned_at", { ascending: false }).limit(5),
          supabase.from("lessons").select("fluency_score").eq("user_id", user.id).not("ended_at", "is", null).order("started_at", { ascending: false }).limit(1).single(),
        ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedAchievements = (achievements ?? []).map((ua: any) => {
        const ach = Array.isArray(ua.achievements) ? ua.achievements[0] : ua.achievements;
        return {
          achievement_id: ua.achievement_id,
          earned_at: ua.earned_at,
          icon: ach?.icon ?? "",
          name_pl: ach?.name_pl ?? "Odznaka",
        };
      });

      setData({
        displayName: userData?.display_name ?? "Kolego",
        currentStreak: streak?.current_streak ?? 0,
        recentAchievements: mappedAchievements,
        lastFluencyScore: recentLesson?.fluency_score ?? null,
      });
      setLoading(false);
    }

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: KIDS_THEME.bgColor }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: KIDS_THEME.accent }} />
      </main>
    );
  }

  if (!data) return null;

  const fluency = data.lastFluencyScore ? kidsFluencyLabel(data.lastFluencyScore) : null;

  return (
    <main className="min-h-screen px-4 py-8" style={{ backgroundColor: KIDS_THEME.bgColor, color: KIDS_THEME.textPrimary }}>
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            {"Cze\u015b\u0107, "}{data.displayName}{"!"}
          </h1>
          {fluency && (
            <p className="mt-1 text-lg" style={{ color: KIDS_THEME.textSecondary }}>
              Ostatnia lekcja: {fluency.emoji} {fluency.label}
            </p>
          )}
        </div>

        <Link
          href="/lesson"
          className="flex items-center justify-center gap-3 rounded-2xl px-6 py-5 text-center text-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
          style={{ backgroundColor: KIDS_THEME.accent }}
        >
          Rozpocznij lekcje
        </Link>

        <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: KIDS_THEME.cardBg, border: `2px solid ${KIDS_THEME.border}` }}>
          <div className="text-4xl font-bold">
            {data.currentStreak}
          </div>
          <p className="mt-1 text-lg font-medium" style={{ color: KIDS_THEME.textSecondary }}>
            {data.currentStreak === 1 ? "dzien z rzedu" : "dni z rzedu"}
          </p>
        </div>

        {data.recentAchievements.length > 0 && (
          <div>
            <h2 className="mb-3 text-center text-lg font-bold" style={{ color: KIDS_THEME.textSecondary }}>
              Twoje odznaki
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {data.recentAchievements.map((ach) => (
                <div key={ach.achievement_id} className="flex flex-col items-center rounded-2xl p-4" style={{ backgroundColor: KIDS_THEME.cardBg, border: `2px solid ${KIDS_THEME.border}`, minWidth: "5rem" }}>
                  <span className="text-3xl">{ach.icon}</span>
                  <span className="mt-1 text-xs font-medium" style={{ color: KIDS_THEME.textSecondary }}>{ach.name_pl}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.recentAchievements.length === 0 && (
          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: KIDS_THEME.cardBg, border: `2px solid ${KIDS_THEME.border}` }}>
            <p className="mt-2 text-lg font-medium" style={{ color: KIDS_THEME.textSecondary }}>
              Ukoncz pierwsza lekcje, zeby zdobyc odznaki!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

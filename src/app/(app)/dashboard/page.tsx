import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Flame,
  Clock,
  GraduationCap,
  MessageCircle,
  TrendingUp,
  Trophy,
  BookOpen,
  Star,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: userData },
    { data: profile },
    { data: streak },
    { data: lessons },
    { data: recentAchievements },
    { count: vocabCount },
  ] = await Promise.all([
    supabase.from("users").select("display_name, role").eq("id", user.id).single(),
    supabase.from("user_profiles").select("target_language, current_level, selected_agent_id").eq("user_id", user.id).limit(1).single(),
    supabase.from("streaks").select("current_streak, longest_streak, weekly_minutes_goal, weekly_minutes_done").eq("user_id", user.id).single(),
    supabase.from("lessons").select("id, started_at, duration_seconds, topic, language, fluency_score").eq("user_id", user.id).not("ended_at", "is", null).order("started_at", { ascending: false }).limit(5),
    supabase.from("user_achievements").select("achievement_id, earned_at, achievements(name_pl, icon, tier)").eq("user_id", user.id).order("earned_at", { ascending: false }).limit(3),
    supabase.from("vocabulary").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const displayName = userData?.display_name ?? "Użytkownik";
  const currentStreak = streak?.current_streak ?? 0;
  const weeklyGoal = streak?.weekly_minutes_goal ?? 30;
  const weeklyDone = streak?.weekly_minutes_done ?? 0;
  const currentLevel = profile?.current_level ?? "A1";
  const targetLang = profile?.target_language ?? "—";
  const totalVocab = typeof vocabCount === "number" ? vocabCount : 0;
  const totalMinutes = (lessons ?? []).reduce((sum, l) => sum + Math.round((l.duration_seconds ?? 0) / 60), 0);

  const langNames: Record<string, string> = {
    es: "Hiszpański", en: "Angielski", no: "Norweski", fr: "Francuski",
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Cześć, {displayName}!</h1>
        <p className="text-text-secondary">{langNames[targetLang] ?? targetLang} · Poziom {currentLevel}</p>
      </div>

      {/* Start lesson CTA */}
      <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Rozpocznij lekcję</h2>
            <p className="text-sm text-text-secondary">Porozmawiaj z AI tutorem</p>
          </div>
          <Link href="/lesson" className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-white hover:bg-primary-dark">
            <MessageCircle className="h-5 w-5" />
            Rozpocznij
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-text-secondary">
            <Flame className="h-4 w-4 text-orange-400" />Seria
          </div>
          <div className="text-2xl font-bold">{currentStreak} <span className="text-sm font-normal text-text-secondary">dni</span></div>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-text-secondary">
            <Clock className="h-4 w-4 text-primary" />Tydzień
          </div>
          <div className="text-2xl font-bold">{weeklyDone}<span className="text-sm font-normal text-text-secondary">/{weeklyGoal} min</span></div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-bg-card-hover">
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, (weeklyDone / weeklyGoal) * 100)}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-text-secondary">
            <GraduationCap className="h-4 w-4 text-green-400" />Poziom
          </div>
          <div className="text-2xl font-bold">{currentLevel}</div>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-text-secondary">
            <BookOpen className="h-4 w-4 text-purple-400" />Słownictwo
          </div>
          <div className="text-2xl font-bold">{totalVocab} <span className="text-sm font-normal text-text-secondary">słów</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent achievements */}
        <div className="rounded-xl border border-border bg-bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold">
              <Trophy className="h-4 w-4 text-yellow-400" />Ostatnie odznaki
            </h3>
            <Link href="/achievements" className="text-sm text-primary hover:underline">Wszystkie</Link>
          </div>
          {!recentAchievements || recentAchievements.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">Ukończ pierwszą lekcję żeby zdobyć odznakę!</p>
          ) : (
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {recentAchievements.map((ua: any) => {
                const ach = Array.isArray(ua.achievements) ? ua.achievements[0] : ua.achievements;
                return (
                  <div key={ua.achievement_id} className="flex items-center gap-3 rounded-lg bg-bg-card-hover p-3">
                    <span className="text-lg">{ach?.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{ach?.name_pl}</div>
                      <div className="text-xs text-text-secondary">{new Date(ua.earned_at).toLocaleDateString("pl-PL")}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent lessons */}
        <div className="rounded-xl border border-border bg-bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold">Ostatnie lekcje</h3>
            <Link href="/progress" className="text-sm text-primary hover:underline">Historia</Link>
          </div>
          {!lessons || lessons.length === 0 ? (
            <div className="py-4 text-center text-text-secondary">
              <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">Nie masz jeszcze żadnych lekcji</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson) => (
                <Link key={lesson.id} href={`/lesson/${lesson.id}/summary`} className="flex items-center justify-between rounded-lg bg-bg-card-hover p-3 hover:bg-bg-card-hover/80">
                  <div>
                    <div className="text-sm font-medium">{lesson.topic ?? "Rozmowa"}</div>
                    <div className="text-xs text-text-secondary">{new Date(lesson.started_at).toLocaleDateString("pl-PL")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lesson.fluency_score && (
                      <div className="flex items-center gap-0.5 text-xs text-yellow-400">
                        <Star className="h-3 w-3 fill-yellow-400" />
                        {Number(lesson.fluency_score).toFixed(1)}
                      </div>
                    )}
                    <div className="text-xs text-text-secondary">
                      {lesson.duration_seconds ? `${Math.round(lesson.duration_seconds / 60)} min` : "—"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm text-text-secondary">
        <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4" />{totalMinutes} minut łącznie</span>
        <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" />{totalVocab} słów</span>
      </div>
    </main>
  );
}

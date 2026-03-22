import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Flame,
  Clock,
  GraduationCap,
  MessageCircle,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: userData }, { data: profile }, { data: streak }, { data: lessons }] =
    await Promise.all([
      supabase
        .from("users")
        .select("display_name, role")
        .eq("id", user.id)
        .single(),
      supabase
        .from("user_profiles")
        .select("target_language, current_level, selected_agent_id")
        .eq("user_id", user.id)
        .limit(1)
        .single(),
      supabase
        .from("streaks")
        .select("current_streak, longest_streak, weekly_minutes_goal, weekly_minutes_done")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("lessons")
        .select("id, started_at, duration_seconds, topic, language")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(5),
    ]);

  const displayName = userData?.display_name ?? "Użytkownik";
  const currentStreak = streak?.current_streak ?? 0;
  const weeklyGoal = streak?.weekly_minutes_goal ?? 30;
  const weeklyDone = streak?.weekly_minutes_done ?? 0;
  const currentLevel = profile?.current_level ?? "A1";
  const targetLang = profile?.target_language ?? "—";

  const langNames: Record<string, string> = {
    es: "Hiszpański",
    en: "Angielski",
    no: "Norweski",
    fr: "Francuski",
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Cześć, {displayName}!
        </h1>
        <p className="text-text-secondary">
          {langNames[targetLang] ?? targetLang} · Poziom {currentLevel}
        </p>
      </div>

      {/* Start lesson CTA */}
      <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Rozpocznij lekcję</h2>
            <p className="text-sm text-text-secondary">
              Porozmawiaj z AI tutorem i ćwicz {langNames[targetLang]?.toLowerCase() ?? "język"}
            </p>
          </div>
          <button
            disabled
            className="flex items-center gap-2 rounded-xl bg-primary/40 px-6 py-3 font-medium text-white/70 cursor-not-allowed"
          >
            <MessageCircle className="h-5 w-5" />
            Wkrótce
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Streak */}
        <div className="rounded-xl border border-border bg-bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
            <Flame className="h-4 w-4 text-orange-400" />
            Seria
          </div>
          <div className="text-3xl font-bold">
            {currentStreak}{" "}
            <span className="text-base font-normal text-text-secondary">
              {currentStreak === 1 ? "dzień" : currentStreak < 5 ? "dni" : "dni"}
            </span>
          </div>
        </div>

        {/* Weekly goal */}
        <div className="rounded-xl border border-border bg-bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
            <Clock className="h-4 w-4 text-primary" />
            Cel tygodniowy
          </div>
          <div className="text-3xl font-bold">
            {weeklyDone}
            <span className="text-base font-normal text-text-secondary">
              /{weeklyGoal} min
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-bg-card-hover">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, (weeklyDone / weeklyGoal) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Level */}
        <div className="rounded-xl border border-border bg-bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
            <GraduationCap className="h-4 w-4 text-green-400" />
            Twój poziom
          </div>
          <div className="text-3xl font-bold">{currentLevel}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
            <TrendingUp className="h-3 w-3" />
            AI dostosowuje poziom automatycznie
          </div>
        </div>
      </div>

      {/* Recent lessons */}
      <div className="rounded-xl border border-border bg-bg-card p-5">
        <h3 className="mb-4 font-bold">Ostatnie lekcje</h3>

        {!lessons || lessons.length === 0 ? (
          <div className="py-8 text-center text-text-secondary">
            <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>Nie masz jeszcze żadnych lekcji</p>
            <p className="text-sm">Rozpocznij swoją pierwszą rozmowę!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between rounded-lg bg-bg-card-hover p-3"
              >
                <div>
                  <div className="font-medium">{lesson.topic ?? "Rozmowa"}</div>
                  <div className="text-sm text-text-secondary">
                    {new Date(lesson.started_at).toLocaleDateString("pl-PL")}
                  </div>
                </div>
                <div className="text-sm text-text-secondary">
                  {lesson.duration_seconds
                    ? `${Math.round(lesson.duration_seconds / 60)} min`
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

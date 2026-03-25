import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BadgeIcon } from "@/components/badge-icon";

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
    supabase.from("user_profiles").select("target_language, current_level").eq("user_id", user.id).limit(1).single(),
    supabase.from("streaks").select("current_streak, longest_streak, weekly_minutes_goal, weekly_minutes_done").eq("user_id", user.id).single(),
    supabase.from("lessons").select("id, started_at, duration_seconds, topic, fluency_score").eq("user_id", user.id).not("ended_at", "is", null).order("started_at", { ascending: false }).limit(5),
    supabase.from("user_achievements").select("achievement_id, earned_at, achievements(name_pl, icon)").eq("user_id", user.id).order("earned_at", { ascending: false }).limit(3),
    supabase.from("vocabulary").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const displayName = userData?.display_name ?? "Użytkownik";
  const currentStreak = streak?.current_streak ?? 0;
  const weeklyGoal = streak?.weekly_minutes_goal ?? 30;
  const weeklyDone = streak?.weekly_minutes_done ?? 0;
  const currentLevel = profile?.current_level ?? "A1";
  const targetLang = profile?.target_language ?? "no";
  const totalVocab = typeof vocabCount === "number" ? vocabCount : 0;
  const totalMinutes = (lessons ?? []).reduce((sum, l) => sum + Math.round((l.duration_seconds ?? 0) / 60), 0);

  const langNames: Record<string, string> = { es: "Hiszpanski", en: "Angielski", no: "Norweski", fr: "Francuski", it: "Wloski", sv: "Szwedzki", de: "Niemiecki", fi: "Finski", pt: "Portugalski", hu: "Wegierski" };

  const weeklyPct = weeklyGoal > 0 ? Math.min(100, Math.round((weeklyDone / weeklyGoal) * 100)) : 0;

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
              {"Cze\u015b\u0107, "}{displayName}!
            </h2>
            <p className="mt-1 flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm text-primary">language</span>
              {langNames[targetLang] ?? targetLang} · Poziom {currentLevel}
            </p>
          </div>
        </section>

        {/* Hero Bento Grid */}
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          {/* Hero CTA */}
          <section className="col-span-12 overflow-hidden rounded-3xl hero-gradient relative min-h-[280px] border border-white/10 shadow-2xl shadow-primary/20 lg:col-span-8 lg:min-h-[380px]">
            <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:w-3/5 lg:p-10">
              <div>
                <span className="mb-4 inline-block rounded-lg bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
                  Rekomendowane
                </span>
                <h3 className="mb-3 text-3xl font-extrabold text-white lg:text-5xl">
                  Rozpocznij lekcje
                </h3>
                <p className="max-w-sm text-white/80 lg:text-lg">
                  Porozmawiaj z AI tutorem i naucz sie nowych slow.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-4">
                <Link
                  href="/lesson"
                  className="flex items-center gap-3 rounded-2xl bg-surface px-6 py-3.5 font-bold text-white shadow-xl transition-all hover:scale-105 active:scale-95 lg:px-8 lg:py-4"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                  START LEKCJI
                </Link>
              </div>
            </div>
          </section>

          {/* Stat Cards */}
          <section className="col-span-12 grid grid-cols-2 gap-4 lg:col-span-4">
            {/* Streak */}
            <div className="card-hover rounded-3xl border border-white/5 bg-surface-container-high p-5 transition-all lg:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary/10">
                <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Seria</p>
              <h4 className="text-2xl font-extrabold text-white lg:text-3xl">{currentStreak} <span className="text-sm font-medium text-slate-500">dni</span></h4>
            </div>

            {/* Weekly */}
            <div className="card-hover rounded-3xl border border-white/5 bg-surface-container-high p-5 transition-all lg:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10">
                <span className="material-symbols-outlined text-secondary">timer</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Tydzien</p>
              <h4 className="text-2xl font-extrabold text-white lg:text-3xl">{weeklyDone}/{weeklyGoal} <span className="text-sm font-medium text-slate-500">min</span></h4>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-variant">
                <div className="h-full bg-secondary transition-all" style={{ width: `${weeklyPct}%` }} />
              </div>
            </div>

            {/* Level */}
            <div className="card-hover rounded-3xl border border-white/5 bg-surface-container-high p-5 transition-all lg:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <span className="material-symbols-outlined text-primary">school</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Poziom</p>
              <h4 className="text-2xl font-extrabold text-white lg:text-3xl">{currentLevel}</h4>
            </div>

            {/* Vocabulary */}
            <div className="card-hover rounded-3xl border border-white/5 bg-surface-container-high p-5 transition-all lg:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10">
                <span className="material-symbols-outlined text-purple-400">menu_book</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Slownictwo</p>
              <h4 className="text-2xl font-extrabold text-white lg:text-3xl">{totalVocab}</h4>
            </div>
          </section>
        </div>

        {/* Two Column Detail */}
        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          {/* Achievements */}
          <section className="col-span-12 space-y-4 lg:col-span-5">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold text-white">Ostatnie odznaki</h3>
              <Link href="/achievements" className="text-sm font-medium text-primary hover:underline">Zobacz wszystkie</Link>
            </div>
            <div className="rounded-3xl border border-white/5 bg-surface-container-low p-8">
              {!recentAchievements || recentAchievements.length === 0 ? (
                <div className="flex flex-col items-center text-center">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-highest shadow-inner">
                    <span className="material-symbols-outlined text-5xl text-primary/40">workspace_premium</span>
                  </div>
                  <p className="font-semibold text-on-surface">Brak odznak</p>
                  <p className="mt-2 max-w-[200px] text-sm text-on-surface-variant">Ukoncz pierwsza lekcje zeby zdobyc odznake!</p>
                  <Link href="/lesson" className="mt-6 rounded-full border border-primary/20 px-6 py-2.5 text-sm font-bold text-primary hover:bg-primary/10">
                    PODEJMIJ WYZWANIE
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {recentAchievements.map((ua: any) => {
                    const ach = Array.isArray(ua.achievements) ? ua.achievements[0] : ua.achievements;
                    return (
                      <div key={ua.achievement_id} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-surface-container-high p-4">
                        <BadgeIcon achievementId={ua.achievement_id} emoji={ach?.icon ?? ""} size={48} earned={true} />
                        <div>
                          <p className="font-bold text-white">{ach?.name_pl}</p>
                          <p className="text-xs text-slate-500">{new Date(ua.earned_at).toLocaleDateString("pl-PL")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Recent lessons */}
          <section className="col-span-12 space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold text-white">Ostatnie lekcje</h3>
              <Link href="/progress" className="text-sm font-medium text-primary hover:underline">Historia lekcji</Link>
            </div>
            <div className="overflow-hidden rounded-3xl border border-white/5 bg-surface-container-low">
              {!lessons || lessons.length === 0 ? (
                <div className="flex flex-col items-center p-12 text-center">
                  <span className="material-symbols-outlined mb-3 text-4xl text-primary/30">chat_bubble</span>
                  <p className="font-semibold text-on-surface">Brak lekcji</p>
                  <p className="mt-1 text-sm text-on-surface-variant">Rozpocznij pierwsza rozmowe!</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {lessons.map((lesson) => (
                    <Link key={lesson.id} href={`/lesson/${lesson.id}/summary`} className="group flex items-center justify-between p-5 transition-colors hover:bg-surface-container-high">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-highest text-primary transition-all group-hover:bg-primary group-hover:text-white">
                          <span className="material-symbols-outlined">chat_bubble</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-white">{lesson.topic ?? "Rozmowa"}</h5>
                          <p className="text-xs text-slate-500">
                            {new Date(lesson.started_at).toLocaleDateString("pl-PL")} · {lesson.duration_seconds ? `${Math.round(lesson.duration_seconds / 60)} min` : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {lesson.fluency_score && (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span key={s} className={`material-symbols-outlined text-sm ${s <= Math.round(Number(lesson.fluency_score)) ? "text-tertiary" : "text-slate-700"}`} style={s <= Math.round(Number(lesson.fluency_score)) ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
                            ))}
                          </div>
                        )}
                        <span className="material-symbols-outlined text-slate-600">chevron_right</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer stats */}
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-sm text-slate-500 md:flex-row">
          <div className="flex items-center gap-8 font-medium">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">history</span>
              {totalMinutes} minut lacznie
            </span>
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">menu_book</span>
              {totalVocab} slow
            </span>
          </div>
        </footer>
      </div>

      {/* Floating Action Button — mobile */}
      <Link
        href="/lesson"
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-godoj-blue text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 lg:bottom-8 lg:right-8 lg:h-16 lg:w-16"
      >
        <span className="material-symbols-outlined text-2xl lg:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>voice_chat</span>
      </Link>
    </div>
  );
}

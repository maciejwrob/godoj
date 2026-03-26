"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { BadgeIcon } from "@/components/badge-icon";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useActiveLanguage } from "@/lib/language-context";
import { getLangFlag, getLangName } from "@/lib/languages";

type Profile = { target_language: string; current_level: string; language_variant: string | null; selected_agent_id: string | null };
type Lesson = { id: string; started_at: string; duration_seconds: number | null; topic: string | null; fluency_score: number | null; language?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Achievement = any;

type DashboardData = {
  displayName: string;
  profiles: Profile[];
  activeLang: string;
  currentLevel: string;
  currentStreak: number;
  weeklyGoal: number;
  weeklyDone: number;
  lessons: Lesson[];
  achievements: Achievement[];
  vocabCount: number;
  totalMinutes: number;
};

export default function DashboardPage() {
  const { activeLanguage, setActiveLanguage } = useActiveLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState(5);

  const fetchData = useCallback(async (lang?: string) => {
    setLoading(true);
    try {
      const url = lang ? `/api/dashboard?lang=${lang}` : "/api/dashboard";
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        if (!lang && d.activeLang) setActiveLanguage(d.activeLang);
      }
    } catch {} finally { setLoading(false); }
  }, [setActiveLanguage]);

  useEffect(() => {
    fetchData(activeLanguage || undefined);
  }, [activeLanguage, fetchData]);

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const { displayName, profiles, currentLevel, currentStreak, weeklyGoal, weeklyDone, lessons, achievements, vocabCount, totalMinutes, activeLang } = data;
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
              <span>{getLangFlag(activeLang)}</span>
              {getLangName(activeLang)} · Poziom {currentLevel}
            </p>
          </div>
          <LanguageSwitcher languages={profiles} />
        </section>

        {/* Hero Bento */}
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          {/* Hero CTA */}
          <section className="col-span-12 overflow-hidden rounded-3xl hero-gradient relative min-h-[240px] border border-white/10 shadow-2xl shadow-primary/20 lg:col-span-8 lg:min-h-[320px]">
            <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:w-3/5 lg:p-10">
              <div>
                <span className="mb-4 inline-block rounded-lg bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
                  {getLangFlag(activeLang)} {getLangName(activeLang)}
                </span>
                <h3 className="mb-3 text-3xl font-extrabold text-white lg:text-4xl">Rozpocznij lekcje</h3>
                <p className="max-w-sm text-white/80">Porozmawiaj z AI tutorem</p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {/* Duration picker */}
                <div className="flex gap-1.5">
                  {[5, 10, 15].map((d) => (
                    <button key={d} onClick={() => setSelectedDuration(d)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${selectedDuration === d ? "bg-white text-surface" : "bg-white/20 text-white hover:bg-white/30"}`}>
                      {d} min
                    </button>
                  ))}
                </div>
                <Link href="/lesson" className="flex items-center gap-2 rounded-2xl bg-surface px-6 py-3 font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                  START
                </Link>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="col-span-12 grid grid-cols-2 gap-4 lg:col-span-4">
            <div className="card-hover rounded-3xl border border-white/5 bg-surface-container-high p-5 lg:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary/10">
                <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Seria</p>
              <h4 className="text-2xl font-extrabold text-white lg:text-3xl">{currentStreak} <span className="text-sm font-medium text-slate-500">dni</span></h4>
            </div>
            <div className="card-hover rounded-3xl border border-white/5 bg-surface-container-high p-5 lg:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10">
                <span className="material-symbols-outlined text-secondary">timer</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Tydzien</p>
              <h4 className="text-2xl font-extrabold text-white lg:text-3xl">{weeklyDone}/{weeklyGoal} <span className="text-sm font-medium text-slate-500">min</span></h4>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-variant">
                <div className="h-full bg-secondary transition-all" style={{ width: `${weeklyPct}%` }} />
              </div>
            </div>
            <div className="card-hover rounded-3xl border border-white/5 bg-surface-container-high p-5 lg:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <span className="material-symbols-outlined text-primary">school</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Poziom</p>
              <h4 className="text-2xl font-extrabold text-white lg:text-3xl">{currentLevel}</h4>
            </div>
            <div className="card-hover rounded-3xl border border-white/5 bg-surface-container-high p-5 lg:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10">
                <span className="material-symbols-outlined text-purple-400">menu_book</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Slownictwo</p>
              <h4 className="text-2xl font-extrabold text-white lg:text-3xl">{vocabCount}</h4>
            </div>
          </section>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          {/* Achievements */}
          <section className="col-span-12 space-y-4 lg:col-span-5">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold text-white">Ostatnie odznaki</h3>
              <Link href="/achievements" className="text-sm font-medium text-primary hover:underline">Wszystkie</Link>
            </div>
            <div className="rounded-3xl border border-white/5 bg-surface-container-low p-8">
              {!achievements || achievements.length === 0 ? (
                <div className="flex flex-col items-center text-center">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-highest shadow-inner">
                    <span className="material-symbols-outlined text-5xl text-primary/40">workspace_premium</span>
                  </div>
                  <p className="font-semibold text-on-surface">Brak odznak</p>
                  <p className="mt-2 max-w-[200px] text-sm text-on-surface-variant">Ukoncz pierwsza lekcje!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {achievements.map((ua: Achievement) => {
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

          {/* Lessons */}
          <section className="col-span-12 space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold text-white">Ostatnie lekcje</h3>
              <Link href="/progress" className="text-sm font-medium text-primary hover:underline">Historia</Link>
            </div>
            <div className="overflow-hidden rounded-3xl border border-white/5 bg-surface-container-low">
              {lessons.length === 0 ? (
                <div className="flex flex-col items-center p-12 text-center">
                  <span className="material-symbols-outlined mb-3 text-4xl text-primary/30">chat_bubble</span>
                  <p className="font-semibold text-on-surface">Brak lekcji</p>
                  <p className="mt-1 text-sm text-on-surface-variant">Rozpocznij pierwsza rozmowe!</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {lessons.map((lesson) => (
                    <Link key={lesson.id} href={`/lesson/${lesson.id}/summary`} className="group flex items-center justify-between p-5 hover:bg-surface-container-high transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-highest text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          <span className="material-symbols-outlined">chat_bubble</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-white">{lesson.language ? getLangFlag(lesson.language) + " " : ""}{lesson.topic ?? "Rozmowa"}</h5>
                          <p className="text-xs text-slate-500">
                            {new Date(lesson.started_at).toLocaleDateString("pl-PL")} · {lesson.duration_seconds ? `${Math.round(lesson.duration_seconds / 60)} min` : "--"}
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

        {/* Footer */}
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-sm text-slate-500 md:flex-row">
          <div className="flex items-center gap-8 font-medium">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">history</span>
              {totalMinutes} minut lacznie
            </span>
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">menu_book</span>
              {vocabCount} slow
            </span>
          </div>
        </footer>
      </div>

      {/* FAB */}
      <Link href="/lesson" className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-godoj-blue text-white shadow-2xl hover:scale-110 active:scale-95 transition-transform lg:bottom-8 lg:right-8 lg:h-16 lg:w-16">
        <span className="material-symbols-outlined text-2xl lg:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>voice_chat</span>
      </Link>
    </div>
  );
}

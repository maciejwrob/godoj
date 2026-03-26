"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { BadgeIcon } from "@/components/badge-icon";
// Language switching is in sidebar dropdown now
import { useLanguage } from "@/lib/language-context";
import { getLangFlag, getLangName } from "@/lib/languages";
import { TutorAvatar } from "@/components/tutor-avatars";

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
  totalLessonsCount: number;
  needsFeedback: boolean;
  feedbackLessonId: string | null;
};

// Flag pattern CSS for hero background
function FlagPattern({ lang }: { lang: string }) {
  const patterns: Record<string, React.ReactNode> = {
    no: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 select-none z-0">
        <div className="absolute w-[150%] h-[150%] -top-1/4 -left-1/4 rotate-[-12deg] flex flex-col">
          <div className="bg-[#EF3340] flex-1 relative">
            <div className="absolute top-0 bottom-0 left-[30%] w-[15%] bg-white"><div className="absolute top-0 bottom-0 left-1/4 right-1/4 bg-[#00205B]" /></div>
            <div className="absolute left-0 right-0 top-[40%] h-[10%] bg-white"><div className="absolute left-0 right-0 top-1/4 bottom-1/4 bg-[#00205B]" /></div>
          </div>
        </div>
      </div>
    ),
    fr: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 select-none z-0">
        <div className="absolute w-[150%] h-[150%] -top-1/4 -left-1/4 rotate-[-12deg] flex">
          <div className="flex-1 bg-[#002395]" /><div className="flex-1 bg-white" /><div className="flex-1 bg-[#ED2939]" />
        </div>
      </div>
    ),
    es: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 select-none z-0">
        <div className="absolute w-[150%] h-[150%] -top-1/4 -left-1/4 rotate-[-12deg] flex flex-col">
          <div className="flex-1 bg-[#AA151B]" /><div className="flex-[2] bg-[#F1BF00]" /><div className="flex-1 bg-[#AA151B]" />
        </div>
      </div>
    ),
    en: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 select-none z-0">
        <div className="absolute w-[150%] h-[150%] -top-1/4 -left-1/4 rotate-[-12deg]">
          <div className="w-full h-full bg-[#012169] relative">
            <div className="absolute top-[45%] left-0 right-0 h-[10%] bg-white" />
            <div className="absolute left-[45%] top-0 bottom-0 w-[10%] bg-white" />
            <div className="absolute top-[47%] left-0 right-0 h-[6%] bg-[#C8102E]" />
            <div className="absolute left-[47%] top-0 bottom-0 w-[6%] bg-[#C8102E]" />
          </div>
        </div>
      </div>
    ),
    it: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 select-none z-0">
        <div className="absolute w-[150%] h-[150%] -top-1/4 -left-1/4 rotate-[-12deg] flex">
          <div className="flex-1 bg-[#009246]" /><div className="flex-1 bg-white" /><div className="flex-1 bg-[#CE2B37]" />
        </div>
      </div>
    ),
    sv: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 select-none z-0">
        <div className="absolute w-[150%] h-[150%] -top-1/4 -left-1/4 rotate-[-12deg]">
          <div className="w-full h-full bg-[#006AA7] relative">
            <div className="absolute top-0 bottom-0 left-[28%] w-[12%] bg-[#FECC02]" />
            <div className="absolute left-0 right-0 top-[42%] h-[12%] bg-[#FECC02]" />
          </div>
        </div>
      </div>
    ),
    de: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 select-none z-0">
        <div className="absolute w-[150%] h-[150%] -top-1/4 -left-1/4 rotate-[-12deg] flex flex-col">
          <div className="flex-1 bg-black" /><div className="flex-1 bg-[#DD0000]" /><div className="flex-1 bg-[#FFCC00]" />
        </div>
      </div>
    ),
    fi: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 select-none z-0">
        <div className="absolute w-[150%] h-[150%] -top-1/4 -left-1/4 rotate-[-12deg]">
          <div className="w-full h-full bg-white relative">
            <div className="absolute top-0 bottom-0 left-[28%] w-[12%] bg-[#003580]" />
            <div className="absolute left-0 right-0 top-[42%] h-[12%] bg-[#003580]" />
          </div>
        </div>
      </div>
    ),
  };
  return patterns[lang] ?? patterns.no;
}

export default function DashboardPage() {
  const { language: activeLang, ready } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);

  const fetchData = useCallback(async (lang: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?lang=${lang}`);
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { if (ready) fetchData(activeLang); }, [activeLang, ready, fetchData]);

  if (loading && !data) return (
    <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  );
  if (!data) return null;

  const { displayName, profiles, currentLevel, currentStreak, weeklyGoal, weeklyDone, lessons, achievements, vocabCount, totalMinutes, totalLessonsCount, needsFeedback, feedbackLessonId } = data;
  const showFeedbackPopup = totalLessonsCount === 1 && needsFeedback && !feedbackDismissed;
  const showFeedbackBanner = totalLessonsCount > 1 && needsFeedback && !feedbackDismissed;
  const weeklyPct = weeklyGoal > 0 ? Math.min(100, Math.round((weeklyDone / weeklyGoal) * 100)) : 0;
  const activeProfile = profiles.find((p) => p.target_language === activeLang);
  const activeVariant = activeProfile?.language_variant ?? null;
  const agentId = activeProfile?.selected_agent_id ?? "godoj-no-adult-mia";

  return (
    <div className="min-h-screen px-4 py-6 lg:px-8 lg:py-8">
      {/* Feedback popup — after first lesson */}
      {showFeedbackPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/5 bg-surface-container p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-full border-2 border-primary/30">
              <img src="/avatars/maciej.png" alt="Maciej" className="w-full h-full object-cover object-top" />
            </div>
            <h2 className="text-lg font-extrabold text-white">Maciej, twórca Godoj.co</h2>
            <p className="mt-3 text-sm text-on-surface-variant">
              Właśnie ukończyłeś swoją pierwszą lekcję — jestem ciekaw jak Ci poszło! Możesz mi o tym opowiedzieć w krótkiej rozmowie (max 2 min)?
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setFeedbackDismissed(true)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-slate-400 hover:text-white">
                Może później
              </button>
              <Link href={`/feedback?lesson_id=${feedbackLessonId}`} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-godoj-blue py-3 text-sm font-bold text-white hover:scale-105 transition-all">
                <span className="material-symbols-outlined text-lg">mic</span>
                Daj feedback
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-8">

        {/* Feedback banner — after subsequent lessons */}
        {showFeedbackBanner && (
          <div className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-primary/20">
              <img src="/avatars/maciej.png" alt="Maciej" className="w-full h-full object-cover object-top" />
            </div>
            <p className="flex-1 text-sm text-on-surface-variant">Nie dałeś feedbacku do ostatniej lekcji — Maciej będzie wdzięczny!</p>
            <Link href={`/feedback?lesson_id=${feedbackLessonId}`} className="shrink-0 rounded-xl bg-godoj-blue px-4 py-2 text-sm font-bold text-white">Daj feedback</Link>
            <button onClick={() => setFeedbackDismissed(true)} className="text-slate-500 hover:text-white"><span className="material-symbols-outlined text-sm">close</span></button>
          </div>
        )}

        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">{"Cze\u015b\u0107, "}{displayName}!</h2>
            <p className="mt-1 flex items-center gap-2 text-on-surface-variant">
              <span>{getLangFlag(activeLang, activeVariant)}</span>
              {getLangName(activeLang)} · Poziom {currentLevel}
            </p>
          </div>
          {/* Language switching is in sidebar */}
        </section>

        {/* Hero + Stats Bento */}
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          {/* Hero CTA */}
          <section className="col-span-12 lg:col-span-8 overflow-hidden rounded-[2rem] hero-gradient relative min-h-[280px] lg:min-h-[380px] shadow-2xl shadow-primary/20 group border border-white/10 flex items-stretch">
            <FlagPattern lang={activeLang} />
            {/* Left content */}
            <div className="relative z-10 w-full lg:w-3/5 p-8 lg:p-10 flex flex-col justify-between">
              <div>
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold text-white mb-4 lg:mb-6 uppercase tracking-wider">
                  {getLangFlag(activeLang, activeVariant)} {getLangName(activeLang)}
                </span>
                <h3 className="text-3xl lg:text-5xl font-black text-white mb-3 leading-tight">{"Rozpocznij lekcj\u0119"}</h3>
                <p className="text-white/80 max-w-sm lg:text-lg">{"Porozmawiaj z AI tutorem i naucz si\u0119 nowych s\u0142\u00f3w."}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-6 lg:mt-8">
                {/* Duration picker */}
                <div className="flex gap-1.5">
                  {[5, 10, 15].map((d) => (
                    <button key={d} onClick={() => setSelectedDuration(d)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${selectedDuration === d ? "bg-white text-surface" : "bg-white/20 text-white hover:bg-white/30"}`}>
                      {d} min
                    </button>
                  ))}
                </div>
                <Link href="/lesson" className="flex items-center gap-3 rounded-2xl bg-surface px-6 py-3 lg:px-8 lg:py-4 font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                  START LEKCJI
                </Link>
              </div>
            </div>
            {/* Right: Tutor avatar */}
            <div className="absolute right-0 top-0 bottom-0 w-2/5 hidden lg:flex items-end justify-center pointer-events-none">
              <div className="relative h-full w-full flex items-end justify-center pb-4">
                <TutorAvatar agentId={agentId} size={280} />
              </div>
            </div>
          </section>

          {/* Stat Cards */}
          <section className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-4">
            <div className="card-hover rounded-[2rem] border border-white/5 bg-surface-container-high p-5 lg:p-6 flex flex-col justify-between">
              <div className="w-12 h-12 rounded-2xl bg-tertiary/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              </div>
              <div>
                <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">Seria</p>
                <h4 className="text-2xl lg:text-3xl font-black text-white">{currentStreak} <span className="text-sm font-medium text-slate-500">dni</span></h4>
              </div>
            </div>
            <div className="card-hover rounded-[2rem] border border-white/5 bg-surface-container-high p-5 lg:p-6 flex flex-col justify-between">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-secondary">timer</span>
              </div>
              <div>
                <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">Tydzień</p>
                <h4 className="text-2xl lg:text-3xl font-black text-white">{weeklyDone}/{weeklyGoal} <span className="text-sm font-medium text-slate-500">min</span></h4>
                <div className="w-full h-1.5 bg-surface-variant rounded-full mt-2 overflow-hidden">
                  <div className="bg-secondary h-full transition-all" style={{ width: `${weeklyPct}%` }} />
                </div>
              </div>
            </div>
            <div className="card-hover rounded-[2rem] border border-white/5 bg-surface-container-high p-5 lg:p-6 flex flex-col justify-between">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary">school</span>
              </div>
              <div>
                <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">Poziom</p>
                <h4 className="text-2xl lg:text-3xl font-black text-white">{currentLevel}</h4>
              </div>
            </div>
            <div className="card-hover rounded-[2rem] border border-white/5 bg-surface-container-high p-5 lg:p-6 flex flex-col justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-purple-400">menu_book</span>
              </div>
              <div>
                <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">Słownictwo</p>
                <h4 className="text-2xl lg:text-3xl font-black text-white">{vocabCount}</h4>
              </div>
            </div>
          </section>
        </div>

        {/* Achievements + Lessons */}
        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          {/* Achievements */}
          <section className="col-span-12 lg:col-span-5 space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xl font-bold text-white">Ostatnie odznaki</h3>
              <Link href="/achievements" className="text-sm text-primary font-medium hover:underline">Zobacz wszystkie</Link>
            </div>
            <div className="bg-surface-container-low rounded-[2rem] p-8 border border-white/5 relative overflow-hidden group min-h-[300px] flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {!achievements || achievements.length === 0 ? (
                <div className="text-center relative z-10">
                  <div className="w-24 h-24 rounded-full bg-surface-container-highest flex items-center justify-center mb-6 shadow-inner mx-auto">
                    <span className="material-symbols-outlined text-primary/40 text-5xl">workspace_premium</span>
                  </div>
                  <p className="text-on-surface font-semibold text-lg">Brak odznak</p>
                  <p className="text-on-surface-variant max-w-[200px] mt-2 text-sm mx-auto">Ukończ pierwszą lekcję żeby zdobyć odznakę!</p>
                  <Link href="/lesson" className="mt-8 inline-block text-sm font-bold text-primary px-6 py-2.5 rounded-full border border-primary/20 hover:bg-primary/10 transition-colors">
                    PODEJMIJ WYZWANIE
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 w-full relative z-10">
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
          <section className="col-span-12 lg:col-span-7 space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xl font-bold text-white">Ostatnie lekcje</h3>
              <Link href="/progress" className="text-sm text-primary font-medium hover:underline">Historia lekcji</Link>
            </div>
            <div className="bg-surface-container-low rounded-[2rem] overflow-hidden border border-white/5">
              {lessons.length === 0 ? (
                <div className="flex flex-col items-center p-12 text-center">
                  <span className="material-symbols-outlined mb-3 text-4xl text-primary/30">chat_bubble</span>
                  <p className="font-semibold text-on-surface">Brak lekcji</p>
                  <p className="mt-1 text-sm text-on-surface-variant">Rozpocznij pierwszą rozmowę!</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-white/5">
                    {lessons.map((lesson) => (
                      <Link key={lesson.id} href={`/lesson/${lesson.id}/summary`} className="group flex items-center justify-between p-5 hover:bg-surface-container-high transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                            <span className="material-symbols-outlined">chat_bubble</span>
                          </div>
                          <div>
                            <h5 className="text-white font-bold">{lesson.language ? getLangFlag(lesson.language) + " " : ""}{lesson.topic ?? "Rozmowa"}</h5>
                            <p className="text-slate-500 text-xs">{new Date(lesson.started_at).toLocaleDateString("pl-PL")} · {lesson.duration_seconds ? `${Math.round(lesson.duration_seconds / 60)} min` : "--"}</p>
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
                  <div className="p-4 bg-surface-container-highest/30 flex justify-center">
                    <Link href="/progress" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-white transition-colors">ZALADUJ WIECEJ</Link>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="pt-12 mt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-slate-500 text-sm gap-4">
          <div className="flex items-center gap-8 font-medium">
            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-xs">history</span>{totalMinutes} {" minut \u0142\u0105cznie"}</span>
            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-xs">menu_book</span>{vocabCount} {" s\u0142\u00f3w"}</span>
          </div>
        </footer>
      </div>

      {/* FAB */}
      <Link href="/lesson" className="fixed bottom-24 right-4 z-50 flex h-14 w-14 lg:h-16 lg:w-16 items-center justify-center rounded-2xl bg-godoj-blue text-white shadow-2xl hover:scale-110 active:scale-95 transition-transform lg:bottom-8 lg:right-8">
        <span className="material-symbols-outlined text-2xl lg:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>voice_chat</span>
      </Link>
    </div>
  );
}

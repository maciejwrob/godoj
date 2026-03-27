import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Flame,
  Clock,
  GraduationCap,
  TrendingUp,
  Star,
  BookOpen,
  Calendar,
} from "lucide-react";
import { getTranslations, resolveLocale } from "@/lib/i18n-data";

type Summary = {
  fluency_score: number;
  new_vocabulary: { word: string; translation: string }[];
};

const CEFR_LABELS: Record<string, string> = {
  A1: "Początkujący",
  A2: "Elementarny",
  B1: "Średnio zaawansowany",
  B2: "Zaawansowany",
  C1: "Biegły",
};

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1"];

// Map total seconds in a day to a color class
function getDayColor(seconds: number): string {
  if (seconds === 0) return "bg-bg-card-hover";
  if (seconds < 300) return "bg-primary/20";
  if (seconds < 900) return "bg-primary/40";
  if (seconds < 1800) return "bg-primary/70";
  return "bg-primary";
}

function getDayLabel(seconds: number, noLessonLabel: string): string {
  if (seconds === 0) return noLessonLabel;
  const min = Math.round(seconds / 60);
  return `${min} min`;
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Date range for contribution calendar: last 84 days (12 weeks)
  const now = new Date();
  const calendarStart = new Date(now);
  calendarStart.setDate(calendarStart.getDate() - 83);
  calendarStart.setHours(0, 0, 0, 0);

  const [
    { data: streak },
    { data: profile },
    { data: allLessons },
    { data: recentLessons },
    { count: vocabTotal },
    { count: vocabMastered },
    { data: userData },
  ] = await Promise.all([
    supabase
      .from("streaks")
      .select(
        "current_streak, longest_streak, last_lesson_date, weekly_minutes_goal, weekly_minutes_done, week_start"
      )
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("user_profiles")
      .select("current_level")
      .eq("user_id", user.id)
      .single(),
    // All lessons in calendar range (for contribution grid + level timeline)
    supabase
      .from("lessons")
      .select(
        "id, started_at, ended_at, duration_seconds, topic, fluency_score, summary_json, level_at_start, level_at_end"
      )
      .eq("user_id", user.id)
      .gte("started_at", calendarStart.toISOString())
      .order("started_at", { ascending: false }),
    // Recent 10 for lesson history
    supabase
      .from("lessons")
      .select(
        "id, started_at, duration_seconds, topic, fluency_score, summary_json"
      )
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(10),
    // Vocabulary counts
    supabase
      .from("vocabulary")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("vocabulary")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("mastered", true),
    supabase
      .from("users")
      .select("native_language")
      .eq("id", user.id)
      .single(),
  ]);

  const t = getTranslations(resolveLocale(userData?.native_language));
  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const weeklyGoal = streak?.weekly_minutes_goal ?? 30;
  const weeklyDone = streak?.weekly_minutes_done ?? 0;
  const currentLevel = profile?.current_level ?? "A1";

  // ── Contribution calendar ──
  // Build a map: dateString -> total seconds
  const dayMap = new Map<string, number>();
  for (const lesson of allLessons ?? []) {
    const dateStr = new Date(lesson.started_at).toISOString().slice(0, 10);
    dayMap.set(dateStr, (dayMap.get(dateStr) ?? 0) + (lesson.duration_seconds ?? 0));
  }

  // Generate 84 days grid (columns = weeks, rows = days of week)
  const days: { date: Date; dateStr: string; seconds: number }[] = [];
  for (let i = 0; i < 84; i++) {
    const d = new Date(calendarStart);
    d.setDate(calendarStart.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: d, dateStr, seconds: dayMap.get(dateStr) ?? 0 });
  }

  // Arrange into weeks (columns)
  const weeks: typeof days[] = [];
  for (let i = 0; i < 84; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const dayLabels = [t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun];

  // ── Weekly goal history (last 4 weeks) ──
  // Simple heuristic: check if weekly minutes met goal for past weeks
  // We'll compute from lessons data by week
  const weekHistory: { weekLabel: string; achieved: boolean }[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - w * 7); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    let totalSec = 0;
    for (const lesson of allLessons ?? []) {
      const lessonDate = new Date(lesson.started_at);
      if (lessonDate >= weekStart && lessonDate < weekEnd) {
        totalSec += lesson.duration_seconds ?? 0;
      }
    }
    const totalMin = Math.round(totalSec / 60);
    const label = weekStart.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
    });
    weekHistory.push({ weekLabel: label, achieved: totalMin >= weeklyGoal });
  }

  // ── Level timeline: find lessons where level changed ──
  const levelChanges: { date: string; from: string; to: string }[] = [];
  for (const lesson of [...(allLessons ?? [])].reverse()) {
    if (
      lesson.level_at_start &&
      lesson.level_at_end &&
      lesson.level_at_start !== lesson.level_at_end
    ) {
      levelChanges.push({
        date: new Date(lesson.started_at).toLocaleDateString("pl-PL"),
        from: lesson.level_at_start,
        to: lesson.level_at_end,
      });
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t.yourProgress}</h1>
        <p className="text-text-secondary">
          {t.statsAndHistory}
        </p>
      </div>

      {/* ── Section 1: Streak ── */}
      <div className="mb-8 rounded-xl border border-border bg-bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <Flame className="h-5 w-5 text-orange-400" />
          {t.streakTitle}
        </h2>

        <div className="mb-6 flex items-center gap-8">
          <div className="text-center">
            <div className="text-5xl font-bold">
              {currentStreak}
              <span className="ml-1 text-2xl">🔥</span>
            </div>
            <div className="mt-1 text-sm text-text-secondary">
              {t.currentStreak}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text-secondary">
              {longestStreak}
            </div>
            <div className="mt-1 text-sm text-text-secondary">
              {t.longestStreak}
            </div>
          </div>
        </div>

        {/* Contribution calendar */}
        <div className="mb-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Calendar className="h-4 w-4" />
            {t.last12Weeks}
          </h3>
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="mr-1 flex flex-col gap-1">
              {dayLabels.map((label) => (
                <div
                  key={label}
                  className="flex h-4 w-6 items-center text-[10px] text-text-secondary"
                >
                  {label}
                </div>
              ))}
            </div>
            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => (
                  <div
                    key={day.dateStr}
                    className={`h-4 w-4 rounded-sm ${getDayColor(day.seconds)}`}
                    title={`${day.date.toLocaleDateString("pl-PL")} — ${getDayLabel(day.seconds, t.noLessonsDay)}`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-3 text-[10px] text-text-secondary">
            <span>{t.less}</span>
            <div className="flex gap-1">
              <div className="h-3 w-3 rounded-sm bg-bg-card-hover" title="Brak lekcji" />
              <div className="h-3 w-3 rounded-sm bg-primary/20" title="<5 min" />
              <div className="h-3 w-3 rounded-sm bg-primary/40" title="5-15 min" />
              <div className="h-3 w-3 rounded-sm bg-primary/70" title="15-30 min" />
              <div className="h-3 w-3 rounded-sm bg-primary" title="30+ min" />
            </div>
            <span>{t.more}</span>
          </div>
        </div>
      </div>

      {/* ── Section 2: Weekly goal ── */}
      <div className="mb-8 rounded-xl border border-border bg-bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <Clock className="h-5 w-5 text-primary" />
          {t.weeklyGoal}
        </h2>

        <div className="mb-2 flex items-end justify-between">
          <span className="text-3xl font-bold">
            {weeklyDone}
            <span className="text-base font-normal text-text-secondary">
              {" "}
              / {weeklyGoal} min
            </span>
          </span>
          <span className="text-sm text-text-secondary">
            {Math.min(100, Math.round((weeklyDone / weeklyGoal) * 100))}%
          </span>
        </div>
        <div className="mb-6 h-3 w-full rounded-full bg-bg-card-hover">
          <div
            className="h-3 rounded-full bg-primary transition-all"
            style={{
              width: `${Math.min(100, (weeklyDone / weeklyGoal) * 100)}%`,
            }}
          />
        </div>

        {/* Week history */}
        <h3 className="mb-3 text-sm font-medium text-text-secondary">
          {t.last4Weeks}
        </h3>
        <div className="flex gap-3">
          {weekHistory.map((wh, i) => (
            <div
              key={i}
              className="flex flex-1 flex-col items-center rounded-lg bg-bg-card-hover p-3"
            >
              <span className="text-lg">{wh.achieved ? "✅" : "❌"}</span>
              <span className="mt-1 text-xs text-text-secondary">
                {wh.weekLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: Level ── */}
      <div className="mb-8 rounded-xl border border-border bg-bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <GraduationCap className="h-5 w-5 text-green-400" />
          {t.levelTitle}
        </h2>

        <div className="mb-6 flex items-center gap-4">
          {/* Level badge */}
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-primary bg-primary/10">
            <span className="text-3xl font-bold text-primary">
              {currentLevel}
            </span>
          </div>
          <div>
            <div className="text-lg font-bold">
              {CEFR_LABELS[currentLevel] ?? currentLevel}
            </div>
            {/* Level scale */}
            <div className="mt-2 flex gap-1">
              {CEFR_ORDER.map((level) => (
                <div
                  key={level}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    level === currentLevel
                      ? "bg-primary text-white"
                      : "bg-bg-card-hover text-text-secondary"
                  }`}
                >
                  {level}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Level change timeline */}
        {levelChanges.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-text-secondary">
              {t.levelChangeHistory}
            </h3>
            <div className="space-y-2">
              {levelChanges.map((change, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-bg-card-hover p-3"
                >
                  <TrendingUp
                    className={`h-4 w-4 ${
                      CEFR_ORDER.indexOf(change.to) >
                      CEFR_ORDER.indexOf(change.from)
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  />
                  <span className="text-sm">
                    {change.from} → {change.to}
                  </span>
                  <span className="ml-auto text-xs text-text-secondary">
                    {change.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {levelChanges.length === 0 && (
          <p className="text-sm text-text-secondary">
            {t.levelAutoAdjust}
          </p>
        )}
      </div>

      {/* ── Section 4: Lesson history ── */}
      <div className="mb-8 rounded-xl border border-border bg-bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <BookOpen className="h-5 w-5 text-primary" />
          {t.lessonHistoryTitle}
        </h2>

        {!recentLessons || recentLessons.length === 0 ? (
          <p className="py-6 text-center text-text-secondary">
            {t.noLessonsYet}
          </p>
        ) : (
          <div className="space-y-3">
            {recentLessons.map((lesson) => {
              const summary = lesson.summary_json as Summary | null;
              const durationMin = lesson.duration_seconds
                ? Math.round(lesson.duration_seconds / 60)
                : 0;
              const fluency = lesson.fluency_score ?? summary?.fluency_score ?? 0;
              const newWordsCount = summary?.new_vocabulary?.length ?? 0;

              return (
                <Link
                  key={lesson.id}
                  href={`/lesson/${lesson.id}/summary`}
                  className="flex items-center justify-between rounded-lg bg-bg-card-hover p-4 transition-colors hover:bg-bg-card-hover/80"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {lesson.topic ?? t.conversation}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-text-secondary">
                      <span>
                        {new Date(lesson.started_at).toLocaleDateString(
                          "pl-PL",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {durationMin} min
                      </span>
                      {newWordsCount > 0 && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          +{newWordsCount} {t.words}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Fluency stars */}
                  {fluency > 0 && (
                    <div className="ml-3 flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.round(fluency)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-bg-card-hover"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 5: Vocabulary summary ── */}
      <div className="rounded-xl border border-border bg-bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <BookOpen className="h-5 w-5 text-primary" />
          {t.vocabularyTitle}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-bg-card-hover p-4 text-center">
            <div className="text-3xl font-bold">{vocabTotal ?? 0}</div>
            <div className="mt-1 text-sm text-text-secondary">
              {t.allWordsCount}
            </div>
          </div>
          <div className="rounded-lg bg-bg-card-hover p-4 text-center">
            <div className="text-3xl font-bold text-green-400">
              {vocabMastered ?? 0}
            </div>
            <div className="mt-1 text-sm text-text-secondary">
              {t.masteredWords}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

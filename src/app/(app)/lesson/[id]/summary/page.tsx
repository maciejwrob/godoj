import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Star,
  Clock,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  Flame,
  ArrowRight,
  Home,
} from "lucide-react";
import PronunciationButton from "./pronunciation-button";
import { EXERCISES_ENABLED } from "@/lib/feature-flags";
import { getTranslations, resolveLocale } from "@/lib/i18n-data";

type Summary = {
  fluency_score: number;
  topics_covered: string[];
  new_vocabulary: { word: string; translation: string; context?: string }[];
  struggled_phrases: string[];
  level_assessment: {
    current: string;
    recommended: string;
    reasoning: string;
  };
  summary_pl: string;
  next_lesson_context: string;
};

export default async function LessonSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!lesson) redirect("/dashboard");

  const summary = lesson.summary_json as Summary | null;
  const [{ data: streak }, { data: profileData }] = await Promise.all([
    supabase
      .from("streaks")
      .select("current_streak, weekly_minutes_done, weekly_minutes_goal")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("user_profiles")
      .select("current_level, xp_current, xp_total, target_language")
      .eq("user_id", user.id)
      .eq("target_language", lesson.language)
      .single(),
  ]);

  const { data: userData } = await supabase
    .from("users")
    .select("ui_language, native_language")
    .eq("id", user.id)
    .single();
  const locale = resolveLocale(userData?.ui_language ?? userData?.native_language);
  const t = getTranslations(locale);

  const durationMin = lesson.duration_seconds
    ? Math.round(lesson.duration_seconds / 60)
    : 0;
  const fluencyScore: number | null = summary?.fluency_score ?? null;
  // Level change detection: use ACTUAL level change from DB, not Claude's recommendation
  const levelChanged = lesson.level_at_end && lesson.level_at_start !== lesson.level_at_end;
  const previousLevel = lesson.level_at_start;
  const newLevelAfter = lesson.level_at_end ?? lesson.level_at_start;

  // XP progress — sub-level thresholds
  const XP_THRESHOLDS: Record<string, number> = {
    "A1": 500, "A1+": 800, "A2": 1000, "A2+": 1200,
    "B1": 1500, "B1+": 2000, "B2": 2500, "B2+": 3000, "C1": 99999,
  };
  const xpEarned = lesson.xp_earned ?? 0;
  const xpCurrent = profileData?.xp_current ?? 0;
  const currentLevel = profileData?.current_level ?? lesson.level_at_start;
  const xpThreshold = XP_THRESHOLDS[currentLevel] ?? 99999;
  const xpPercent = xpThreshold < 99999 ? Math.min(100, Math.round((xpCurrent / xpThreshold) * 100)) : 100;

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">{t.lessonCompleted}</h1>
        <p className="mt-1 text-text-secondary">
          {lesson.topic} · {durationMin} min
        </p>
      </div>

      {/* Fluency score — only show stars if we have enough data */}
      {fluencyScore !== null ? (
        <div className="mb-6 rounded-2xl border border-border bg-bg-card p-6 text-center">
          <div className="text-sm text-text-secondary">{t.fluency}</div>
          <div className="mt-2 flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-8 w-8 transition-all ${
                  star <= Math.round(fluencyScore)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-bg-card-hover"
                }`}
              />
            ))}
          </div>
          <div className="mt-1 text-2xl font-bold">{fluencyScore.toFixed(1)}</div>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-border bg-bg-card p-6 text-center">
          <div className="text-3xl mb-2">💬</div>
          <div className="text-sm text-text-secondary">
            {t.tooShortForRating}
          </div>
        </div>
      )}

      {/* Level change banner — based on actual DB change, not Claude's recommendation */}
      {levelChanged && (
        <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
          <TrendingUp className="mx-auto h-6 w-6 text-green-400" />
          <div className="mt-2 font-bold text-green-400">
            {newLevelAfter > previousLevel
              ? `${t.levelUp} ${newLevelAfter}!`
              : `${t.levelAdjusted} ${newLevelAfter}`}
          </div>
          {summary?.level_assessment?.reasoning && (
            <div className="mt-1 text-sm text-text-secondary">
              {summary.level_assessment.reasoning}
            </div>
          )}
        </div>
      )}

      {/* XP Progress */}
      {xpEarned > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 font-bold">
              <TrendingUp className="h-4 w-4 text-primary" />
              XP
            </h3>
            <span className="text-sm font-bold text-primary">+{xpEarned} XP</span>
          </div>
          {currentLevel !== "C1" ? (
            <>
              <div className="flex items-center justify-between text-sm text-text-secondary mb-2">
                <span>{currentLevel}</span>
                <span>{xpCurrent}/{xpThreshold} XP</span>
              </div>
              <div className="h-3 w-full rounded-full bg-bg-card-hover">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-text-secondary text-right">
                {xpThreshold - xpCurrent} XP {t.xpToNextLevel}
              </div>
            </>
          ) : (
            <div className="text-sm text-text-secondary">
              {t.maxLevelReached}
            </div>
          )}
        </div>
      )}

      {/* Streak & weekly */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
          <Flame className="mx-auto h-5 w-5 text-orange-400" />
          <div className="mt-1 text-xl font-bold">
            {streak?.current_streak ?? 0}
          </div>
          <div className="text-xs text-text-secondary">{t.streakDays}</div>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
          <Clock className="mx-auto h-5 w-5 text-primary" />
          <div className="mt-1 text-xl font-bold">
            {streak?.weekly_minutes_done ?? 0}/{streak?.weekly_minutes_goal ?? 30}
          </div>
          <div className="text-xs text-text-secondary">{t.minutesThisWeek}</div>
        </div>
      </div>

      {/* Summary text */}
      {summary?.summary_pl && (
        <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
          <h3 className="mb-2 font-bold">{t.summary}</h3>
          <p className="text-sm text-text-secondary">{summary.summary_pl}</p>
        </div>
      )}

      {/* New vocabulary */}
      {summary?.new_vocabulary && summary.new_vocabulary.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold">
            <BookOpen className="h-4 w-4 text-primary" />
            {t.newVocabulary}
          </h3>
          <div className="space-y-2">
            {summary.new_vocabulary.map((v, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-bg-card-hover p-3"
              >
                <div>
                  <div className="font-medium">{v.word}</div>
                  <div className="text-sm text-text-secondary">
                    {v.translation}
                  </div>
                  {v.context && (
                    <div className="mt-1 text-xs italic text-text-secondary/70">
                      &ldquo;{v.context}&rdquo;
                    </div>
                  )}
                </div>
                <PronunciationButton
                  text={v.word}
                  language={lesson.language}
                />
              </div>
            ))}
          </div>
          {/* Practice CTA inside vocab card — hidden until EXERCISES_ENABLED */}
          {EXERCISES_ENABLED && (
            <Link href="/exercises" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-tertiary/10 border border-tertiary/20 px-4 py-2.5 text-sm font-bold text-tertiary hover:bg-tertiary/20 transition-all">
              <span className="material-symbols-outlined text-base">fitness_center</span>
              Pocwicz te slowa teraz!
            </Link>
          )}
        </div>
      )}

      {/* Struggled phrases */}
      {summary?.struggled_phrases && summary.struggled_phrases.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            {t.toImprove}
          </h3>
          <div className="space-y-2">
            {summary.struggled_phrases.map((phrase, i) => (
              <div
                key={i}
                className="rounded-lg bg-bg-card-hover px-3 py-2 text-sm text-text-secondary"
              >
                {phrase}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-text-secondary hover:text-text-primary"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/lesson"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-dark"
        >
          {t.nextLesson}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}

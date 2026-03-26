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
  const { data: streak } = await supabase
    .from("streaks")
    .select("current_streak, weekly_minutes_done, weekly_minutes_goal")
    .eq("user_id", user.id)
    .single();

  const durationMin = lesson.duration_seconds
    ? Math.round(lesson.duration_seconds / 60)
    : 0;
  const fluencyScore = summary?.fluency_score ?? 3;
  const levelChanged =
    summary?.level_assessment?.recommended !== summary?.level_assessment?.current;

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Lekcja ukończona!</h1>
        <p className="mt-1 text-text-secondary">
          {lesson.topic} · {durationMin} min
        </p>
      </div>

      {/* Fluency score */}
      <div className="mb-6 rounded-2xl border border-border bg-bg-card p-6 text-center">
        <div className="text-sm text-text-secondary">Płynność</div>
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

      {/* Level change banner */}
      {levelChanged && summary?.level_assessment && (
        <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
          <TrendingUp className="mx-auto h-6 w-6 text-green-400" />
          <div className="mt-2 font-bold text-green-400">
            {summary.level_assessment.recommended > summary.level_assessment.current
              ? `Awansowałeś na ${summary.level_assessment.recommended}!`
              : `Dostosowaliśmy poziom do ${summary.level_assessment.recommended}`}
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            {summary.level_assessment.reasoning}
          </div>
        </div>
      )}

      {/* Streak & weekly */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
          <Flame className="mx-auto h-5 w-5 text-orange-400" />
          <div className="mt-1 text-xl font-bold">
            {streak?.current_streak ?? 0}
          </div>
          <div className="text-xs text-text-secondary">Seria dni</div>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
          <Clock className="mx-auto h-5 w-5 text-primary" />
          <div className="mt-1 text-xl font-bold">
            {streak?.weekly_minutes_done ?? 0}/{streak?.weekly_minutes_goal ?? 30}
          </div>
          <div className="text-xs text-text-secondary">Minut w tym tygodniu</div>
        </div>
      </div>

      {/* Summary text */}
      {summary?.summary_pl && (
        <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
          <h3 className="mb-2 font-bold">Podsumowanie</h3>
          <p className="text-sm text-text-secondary">{summary.summary_pl}</p>
        </div>
      )}

      {/* New vocabulary */}
      {summary?.new_vocabulary && summary.new_vocabulary.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold">
            <BookOpen className="h-4 w-4 text-primary" />
            Nowe słownictwo
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
        </div>
      )}

      {/* Struggled phrases */}
      {summary?.struggled_phrases && summary.struggled_phrases.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            Nad czym popracować
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

      {/* Exercise CTA */}
      {summary?.new_vocabulary && summary.new_vocabulary.length > 0 && (
        <Link
          href={`/exercises`}
          className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-tertiary/10 border border-tertiary/20 px-4 py-3 text-sm font-bold text-tertiary hover:bg-tertiary/20 transition-all"
        >
          <span className="material-symbols-outlined text-lg">fitness_center</span>
          Pocwicz te slowa teraz!
        </Link>
      )}

      {/* Feedback CTA */}
      <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4">
        <div className="h-12 w-12 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center border border-primary/20">
          <img src="/avatars/maciej.png" alt="Maciej" className="w-full h-full object-cover object-top rounded-full" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-on-surface">Maciej, tworca godoj.co, chcialby uslyszec Twoj feedback!</p>
          <p className="text-xs text-on-surface-variant">Krótka rozmowa (2 min)</p>
        </div>
        <Link href={`/feedback?lesson_id=${id}`} className="shrink-0 rounded-xl bg-godoj-blue px-4 py-2 text-sm font-bold text-white hover:scale-105 transition-all">
          Daj feedback
        </Link>
      </div>

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
          Kolejna lekcja
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}

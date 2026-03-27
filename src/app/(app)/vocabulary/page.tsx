import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen, Search, Volume2, Filter } from "lucide-react";
import VocabularyClient from "./vocabulary-client";
import { getTranslations, resolveLocale } from "@/lib/i18n";

// Types shared between server and client
export type VocabularyWord = {
  id: string;
  language: string;
  word: string;
  translation: string;
  context_sentence: string | null;
  lesson_id: string | null;
  times_used: number;
  mastery_level: number;
  last_seen_at: string | null;
  pronunciation_url: string | null;
  created_at: string;
};

export default async function VocabularyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: words }, { data: profile }, { data: userData }] = await Promise.all([
    supabase
      .from("vocabulary")
      .select(
        "id, language, word, translation, context_sentence, lesson_id, times_used, mastery_level, last_seen_at, pronunciation_url, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_profiles")
      .select("target_language")
      .eq("user_id", user.id)
      .limit(1)
      .single(),
    supabase
      .from("users")
      .select("native_language")
      .eq("id", user.id)
      .single(),
  ]);

  const vocabulary: VocabularyWord[] = words ?? [];
  const language = profile?.target_language ?? "en";
  const t = getTranslations(resolveLocale(userData?.native_language));

  // Compute stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalWords = vocabulary.length;
  const newThisWeek = vocabulary.filter(
    (w) => new Date(w.created_at) >= weekAgo
  ).length;
  const needsReview = vocabulary.filter((w) => w.mastery_level < 3).length;
  const mastered = vocabulary.filter((w) => w.mastery_level >= 4).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">{t.myVocabulary}</h1>
        </div>
        <p className="mt-1 text-text-secondary">
          {t.allWords}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <div className="text-sm text-text-secondary">{t.all}</div>
          <div className="mt-1 text-2xl font-bold">{totalWords}</div>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <div className="text-sm text-text-secondary">{t.newThisWeek}</div>
          <div className="mt-1 text-2xl font-bold text-primary">
            {newThisWeek}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <div className="text-sm text-text-secondary">{t.toReview}</div>
          <div className="mt-1 text-2xl font-bold text-orange-400">
            {needsReview}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <div className="text-sm text-text-secondary">{t.mastered}</div>
          <div className="mt-1 text-2xl font-bold text-green-400">
            {mastered}
          </div>
        </div>
      </div>

      {/* Client-side search, filter, and word list */}
      <VocabularyClient words={vocabulary} language={language} />
    </main>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Search, Filter, Volume2, Play, Loader2 } from "lucide-react";
import type { VocabularyWord } from "./page";
import { useLanguage } from "@/lib/language-context";
import { getLangFlag, getLangName } from "@/lib/languages";
import { useTranslation } from "@/lib/i18n";

// --- Pronunciation Button (client component) ---

function PronunciationButton({
  text,
  language,
}: {
  text: string;
  language: string;
}) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const play = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={play}
      disabled={loading}
      className="rounded-lg p-2 text-text-secondary transition-colors hover:text-primary"
      title={t("playPronunciation")}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </button>
  );
}

// --- Mastery Bar ---

function MasteryBar({ level }: { level: number }) {
  const { t } = useTranslation();
  const labels = [t("masteryNew"), t("masteryBeginner"), t("masteryRecognize"), t("masteryPracticing"), t("masteryKnow"), t("masteryMastered")];
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-5 rounded-sm ${
              i < level
                ? level >= 4
                  ? "bg-green-400"
                  : level >= 2
                    ? "bg-primary"
                    : "bg-orange-400"
                : "bg-bg-card-hover"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-text-secondary">
        {labels[level] ?? `${level}/5`}
      </span>
    </div>
  );
}

// --- Word Card ---

function WordCard({
  word,
  language,
}: {
  word: VocabularyWord;
  language: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 transition-colors hover:bg-bg-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Word + pronunciation */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{word.word}</span>
            <PronunciationButton text={word.word} language={language} />
          </div>

          {/* Translation */}
          <p className="mt-0.5 text-text-secondary">{word.translation}</p>

          {/* Context sentence */}
          {word.context_sentence && (
            <p className="mt-2 text-sm italic text-text-secondary">
              &ldquo;{word.context_sentence}&rdquo;
            </p>
          )}
        </div>

        {/* Times used badge */}
        {word.times_used > 0 && (
          <span className="shrink-0 rounded-full bg-bg-card-hover px-2 py-0.5 text-xs text-text-secondary">
            {word.times_used}x
          </span>
        )}
      </div>

      {/* Footer: mastery + last seen */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <MasteryBar level={word.mastery_level} />
        {word.last_seen_at && (
          <span className="text-xs text-text-secondary">
            {t("lastSeen")}:{" "}
            {new Date(word.last_seen_at).toLocaleDateString("pl-PL")}
          </span>
        )}
      </div>
    </div>
  );
}

// --- Mastery Group Header ---

function MasteryGroupHeader({ level, count }: { level: number; count: number }) {
  const { t } = useTranslation();
  const labels: Record<number, string> = {
    0: t("masteryNewWords"),
    1: t("masteryBeginnerWords"),
    2: t("masteryRecognizedWords"),
    3: t("masteryPracticedWords"),
    4: t("masteryKnownWords"),
    5: t("masteryMasteredWords"),
  };
  return (
    <h3 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold text-text-secondary first:mt-0">
      <MasteryBar level={level} />
      <span>
        {labels[level] ?? `Poziom ${level}`} ({count})
      </span>
    </h3>
  );
}

// --- Sort / Group types ---

type SortOption = "newest" | "oldest" | "most_used" | "needs_review";
type GroupOption = "chronological" | "mastery";

// --- Main Client Component ---

export default function VocabularyClient({
  words,
  language,
}: {
  words: VocabularyWord[];
  language: string;
}) {
  const { language: ctxLang } = useLanguage();
  const activeLang = ctxLang || language;
  const { t } = useTranslation();

  // Filter by active language
  const langWords = useMemo(() => words.filter((w) => w.language === activeLang), [words, activeLang]);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [group, setGroup] = useState<GroupOption>("chronological");
  const [showFilters, setShowFilters] = useState(false);

  // Filter by search query
  const filtered = useMemo(() => {
    if (!search.trim()) return langWords;
    const q = search.toLowerCase();
    return langWords.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.translation.toLowerCase().includes(q) ||
        (w.context_sentence?.toLowerCase().includes(q) ?? false)
    );
  }, [words, search]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "newest":
        return arr.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "oldest":
        return arr.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case "most_used":
        return arr.sort((a, b) => b.times_used - a.times_used);
      case "needs_review":
        return arr.sort((a, b) => a.mastery_level - b.mastery_level);
      default:
        return arr;
    }
  }, [filtered, sort]);

  // Group by mastery if needed
  const grouped = useMemo(() => {
    if (group !== "mastery") return null;
    const map = new Map<number, VocabularyWord[]>();
    for (const w of sorted) {
      const existing = map.get(w.mastery_level) ?? [];
      existing.push(w);
      map.set(w.mastery_level, existing);
    }
    // Sort groups ascending by mastery level
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [sorted, group]);

  const sortLabels: Record<SortOption, string> = {
    newest: t("newest"),
    oldest: t("oldest"),
    most_used: t("mostUsed"),
    needs_review: t("needsReview"),
  };

  return (
    <>
      {/* Search bar */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchWords")}
            className="w-full rounded-xl border border-border bg-bg-card py-2.5 pl-10 pr-4 text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
            showFilters
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-bg-card text-text-secondary hover:text-text-primary"
          }`}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">{t("filters")}</span>
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-6 flex flex-wrap gap-4 rounded-xl border border-border bg-bg-card p-4">
          {/* Sort */}
          <div>
            <label className="mb-1 block text-xs text-text-secondary">
              {t("sort")}
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-lg border border-border bg-bg-dark px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              {(Object.entries(sortLabels) as [SortOption, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Group */}
          <div>
            <label className="mb-1 block text-xs text-text-secondary">
              {t("group")}
            </label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as GroupOption)}
              className="rounded-lg border border-border bg-bg-dark px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="chronological">{t("chronological")}</option>
              <option value="mastery">{t("byLevel")}</option>
            </select>
          </div>

          {/* Result count */}
          <div className="flex items-end">
            <span className="text-sm text-text-secondary">
              {sorted.length}{" "}
              {sorted.length === 1
                ? t("wordSingular")
                : sorted.length < 5
                  ? t("wordFew")
                  : t("wordMany")}
            </span>
          </div>
        </div>
      )}

      {/* Word list */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card py-12 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-text-secondary opacity-50" />
          {words.length === 0 ? (
            <>
              <p className="text-text-secondary">
                {t("noWordsYet")}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {t("wordsAfterLessons")}
              </p>
            </>
          ) : (
            <p className="text-text-secondary">
              {t("noResults")} &ldquo;{search}&rdquo;
            </p>
          )}
        </div>
      ) : group === "mastery" && grouped ? (
        // Grouped by mastery
        <div>
          {grouped.map(([level, groupWords]) => (
            <div key={level}>
              <MasteryGroupHeader level={level} count={groupWords.length} />
              <div className="grid gap-3 sm:grid-cols-2">
                {groupWords.map((w) => (
                  <WordCard key={w.id} word={w} language={language} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat chronological list
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((w) => (
            <WordCard key={w.id} word={w} language={language} />
          ))}
        </div>
      )}
    </>
  );
}

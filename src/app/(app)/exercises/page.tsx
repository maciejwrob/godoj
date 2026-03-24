"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell,
  Loader2,
  ArrowLeft,
  Check,
  X,
  Volume2,
  RotateCcw,
  ArrowRight,
  Home,
  Zap,
  Star,
} from "lucide-react";

// ---- Types ----

type Exercise = {
  id: number;
  type: string;
  vocabulary_id: string;
  word: string;
  translation: string;
  context: string | null;
  mastery: number;
  language: string;
  distractors_translations: string[];
  distractors_words: string[];
  fill_sentence: { sentence_with_gap: string; answer: string; translation_pl: string } | null;
  word_order: { translation_pl: string; words: string[]; correct_order: string[] } | null;
};

type MatchPair = { word: string; translation: string; vocabulary_id: string };
type Result = { vocabulary_id: string; correct: boolean; exercise_type: string };
type PageState = "loading" | "ready" | "exercise" | "feedback" | "summary" | "not_enough";

// ---- Main Component ----

export default function ExercisesPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>("ready");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [matchingGroup, setMatchingGroup] = useState<MatchPair[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [lastAnswer, setLastAnswer] = useState("");
  const [isChallenge, setIsChallenge] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const current = exercises[currentIndex] ?? null;
  const total = exercises.length;
  const correctCount = results.filter((r) => r.correct).length;

  // ---- Load exercises ----

  const startSession = async (challenge = false) => {
    setState("loading");
    setIsChallenge(challenge);
    setResults([]);
    setCurrentIndex(0);

    try {
      const res = await fetch("/api/exercises/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_challenge: challenge }),
      });
      const data = await res.json();

      if (data.error === "not_enough_words") {
        setWordCount(data.word_count);
        setState("not_enough");
        return;
      }

      if (!res.ok) throw new Error(data.error);

      setExercises(data.exercises);
      setMatchingGroup(data.matching_group ?? []);
      setSessionId(data.session_id);
      setState("exercise");
    } catch {
      setState("ready");
    }
  };

  // ---- Submit answer ----

  const submitAnswer = useCallback((correct: boolean, answer = "", neutral = false) => {
    if (!current) return;
    setLastCorrect(neutral ? null : correct);
    setLastAnswer(answer);
    setResults((prev) => [...prev, {
      vocabulary_id: current.vocabulary_id,
      correct,
      exercise_type: current.type,
    }]);
    setState("feedback");
  }, [current]);

  const nextExercise = () => {
    if (currentIndex + 1 >= total) {
      completeSession();
    } else {
      setCurrentIndex((i) => i + 1);
      setState("exercise");
      setLastCorrect(null);
    }
  };

  const completeSession = async () => {
    setState("summary");
    try {
      await fetch("/api/exercises/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, results }),
      });
    } catch { /* non-critical */ }
  };

  // ---- TTS ----

  const playTTS = async (text: string, language: string) => {
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
    } catch {}
  };

  // ---- RENDER: Ready ----

  if (state === "ready") {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-8 text-center">
          <Dumbbell className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Ćwiczenia</h1>
          <p className="mt-2 text-text-secondary">Utrwal słówka z rozmów</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => startSession(false)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-bg-card p-5 text-left hover:border-primary/50"
          >
            <div>
              <div className="font-bold">Dzisiejszy trening</div>
              <div className="text-sm text-text-secondary">10-15 ćwiczeń z Twoich słówek</div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary" />
          </button>

          <button
            onClick={() => startSession(true)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-bg-card p-5 text-left hover:border-yellow-500/50"
          >
            <div>
              <div className="flex items-center gap-2 font-bold">
                <Zap className="h-4 w-4 text-yellow-400" />Wyzwanie
              </div>
              <div className="text-sm text-text-secondary">Trudniejsze ćwiczenia</div>
            </div>
            <ArrowRight className="h-5 w-5 text-yellow-400" />
          </button>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="mt-8 flex w-full items-center justify-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />Wróć do Dashboard
        </button>
      </main>
    );
  }

  // ---- RENDER: Loading ----

  if (state === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-text-secondary">Przygotowuję trening...</p>
      </main>
    );
  }

  // ---- RENDER: Not enough words ----

  if (state === "not_enough") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="max-w-sm space-y-6 text-center">
          <Dumbbell className="mx-auto h-12 w-12 text-text-secondary" />
          <h2 className="text-xl font-bold">Za mało słówek</h2>
          <p className="text-text-secondary">
            Masz {wordCount} słów w słowniczku. Porozmawiaj z tutorem żeby zebrać
            przynajmniej 5 słówek do ćwiczeń!
          </p>
          <button
            onClick={() => router.push("/lesson")}
            className="rounded-xl bg-primary px-6 py-3 font-medium text-white hover:bg-primary-dark"
          >
            Rozpocznij lekcję
          </button>
        </div>
      </main>
    );
  }

  // ---- RENDER: Summary ----

  if (state === "summary") {
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Star className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">
            {pct >= 80 ? "Świetnie!" : pct >= 50 ? "Dobra robota!" : "Nie poddawaj się!"}
          </h1>
          <p className="mt-2 text-text-secondary">
            {isChallenge ? "Wyzwanie ukończone" : "Trening ukończony"}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
            <div className="text-2xl font-bold text-primary">{correctCount}/{total}</div>
            <div className="text-xs text-text-secondary">Poprawnych</div>
          </div>
          <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{pct}%</div>
            <div className="text-xs text-text-secondary">Skuteczność</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm text-text-secondary hover:text-text-primary"
          >
            <Home className="h-4 w-4" />Dashboard
          </button>
          <button
            onClick={() => startSession(false)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-dark"
          >
            <RotateCcw className="h-4 w-4" />Jeszcze raz
          </button>
        </div>
      </main>
    );
  }

  // ---- RENDER: Feedback ----

  if (state === "feedback" && current) {
    const isNeutral = lastCorrect === null;
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg">
        <ProgressBar current={currentIndex + 1} total={total} />

        <div className="mt-12 text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            isNeutral ? "bg-tertiary/20" : lastCorrect ? "bg-green-500/20" : "bg-red-500/20"
          }`}>
            {isNeutral
              ? <span className="material-symbols-outlined text-3xl text-tertiary">psychology</span>
              : lastCorrect
                ? <Check className="h-8 w-8 text-green-400" />
                : <X className="h-8 w-8 text-red-400" />}
          </div>
          <h2 className="text-xl font-bold">
            {isNeutral ? "Do powtorki!" : lastCorrect ? "Dobrze!" : "Nie tym razem"}
          </h2>
          {isNeutral && (
            <p className="mt-2 text-on-surface-variant">
              {current.word} → {current.translation}
            </p>
          )}
          {lastCorrect === false && (
            <p className="mt-2 text-on-surface-variant">
              Poprawna odpowiedz: <span className="font-medium text-on-surface">{current.word}</span> → {current.translation}
            </p>
          )}
        </div>

        <button
          onClick={nextExercise}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-white hover:bg-primary-dark"
        >
          {currentIndex + 1 >= total ? "Podsumowanie" : "Dalej"}
          <ArrowRight className="h-4 w-4" />
        </button>
        </div>
      </main>
    );
  }

  // ---- RENDER: Exercise ----

  if (state === "exercise" && current) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg">
        <ProgressBar current={currentIndex + 1} total={total} />

        <div className="mt-8">
          {current.type === "flashcard" && (
            <FlashcardExercise ex={current} onResult={submitAnswer} onTTS={playTTS} />
          )}
          {current.type === "translate_to_native" && (
            <MultipleChoiceExercise
              question={current.word}
              questionLabel="Jak to przetłumaczysz?"
              correct={current.translation}
              options={dedupeOptions(current.translation, current.distractors_translations)}
              onResult={submitAnswer}
              onTTS={() => playTTS(current.word, current.language)}
              showTTS
            />
          )}
          {current.type === "translate_to_target" && (
            <MultipleChoiceExercise
              question={current.translation}
              questionLabel="Wybierz słowo"
              correct={current.word}
              options={dedupeOptions(current.word, current.distractors_words)}
              onResult={submitAnswer}
            />
          )}
          {current.type === "fill_gap" && current.fill_sentence && (
            <FillGapExercise
              sentence={current.fill_sentence.sentence_with_gap}
              answer={current.fill_sentence.answer}
              translation={current.fill_sentence.translation_pl}
              distractors={current.distractors_words.slice(0, 2)}
              onResult={submitAnswer}
            />
          )}
          {current.type === "word_order" && current.word_order && (
            <WordOrderExercise
              translationPl={current.word_order.translation_pl}
              words={current.word_order.words}
              correctOrder={current.word_order.correct_order}
              onResult={submitAnswer}
            />
          )}
          {current.type === "matching" && (
            <MatchingExercise pairs={matchingGroup} onResult={submitAnswer} />
          )}
          {current.type === "listening" && (
            <ListeningExercise
              word={current.word}
              language={current.language}
              correct={current.word}
              options={dedupeOptions(current.word, current.distractors_words)}
              onResult={submitAnswer}
              onTTS={playTTS}
            />
          )}
          {/* Fallback for missing data */}
          {!["flashcard", "translate_to_native", "translate_to_target", "fill_gap", "word_order", "matching", "listening"].includes(current.type) && (
            <MultipleChoiceExercise
              question={current.word}
              questionLabel="Jak to przetłumaczysz?"
              correct={current.translation}
              options={dedupeOptions(current.translation, current.distractors_translations)}
              onResult={submitAnswer}
            />
          )}
        </div>
        </div>
      </main>
    );
  }

  return null;
}

// ---- Helper ----

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deduplicate: ensure correct answer is in array exactly once
function dedupeOptions(correct: string, distractors: string[]): string[] {
  const unique = distractors.filter((d) => d.toLowerCase() !== correct.toLowerCase());
  return shuffle([correct, ...unique.slice(0, 3)]);
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div>
      <div className="mb-1 text-center text-xs text-text-secondary">{current}/{total}</div>
      <div className="h-2 w-full rounded-full bg-bg-card">
        <div
          className="h-2 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ---- Exercise Components ----

function FlashcardExercise({ ex, onResult, onTTS }: {
  ex: Exercise;
  onResult: (correct: boolean, answer?: string, neutral?: boolean) => void;
  onTTS: (text: string, lang: string) => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="text-center">
      <p className="mb-4 text-sm text-text-secondary">Znasz to słowo?</p>

      <div
        onClick={() => setFlipped(!flipped)}
        className="mx-auto flex h-48 w-full max-w-sm cursor-pointer items-center justify-center rounded-2xl border border-border bg-bg-card p-6 transition-all hover:border-primary/50"
        style={{ perspective: "1000px" }}
      >
        {!flipped ? (
          <div className="text-center">
            <div className="text-2xl font-bold">{ex.word}</div>
            <div className="mt-2 text-xs text-text-secondary">Dotknij żeby odkryć</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{ex.translation}</div>
            {ex.context && (
              <div className="mt-2 text-sm italic text-text-secondary">&ldquo;{ex.context}&rdquo;</div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onTTS(ex.word, ex.language); }}
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-bg-card-hover px-3 py-1 text-xs text-text-secondary hover:text-primary"
            >
              <Volume2 className="h-3 w-3" />Wymowa
            </button>
          </div>
        )}
      </div>

      {flipped && (
        <div className="mt-6 flex gap-3">
          <button onClick={() => onResult(false, "", true)} className="flex-1 rounded-xl border border-slate-500/30 py-3 text-sm font-medium text-slate-400 hover:bg-slate-500/10">
            Nie znalem
          </button>
          <button onClick={() => onResult(true, "", true)} className="flex-1 rounded-xl border border-tertiary/30 py-3 text-sm font-medium text-tertiary hover:bg-tertiary/10">
            Trudne
          </button>
          <button onClick={() => onResult(true)} className="flex-1 rounded-xl border border-green-500/30 py-3 text-sm font-medium text-green-400 hover:bg-green-500/10">
            Latwe
          </button>
        </div>
      )}
    </div>
  );
}

function MultipleChoiceExercise({ question, questionLabel, correct, options, onResult, onTTS, showTTS }: {
  question: string;
  questionLabel: string;
  correct: string;
  options: string[];
  onResult: (correct: boolean, answer?: string) => void;
  onTTS?: () => void;
  showTTS?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => onResult(opt === correct, opt), 600);
  };

  return (
    <div className="text-center">
      <p className="mb-2 text-sm text-text-secondary">{questionLabel}</p>
      <div className="mb-6 flex items-center justify-center gap-2">
        <span className="text-2xl font-bold">{question}</span>
        {showTTS && onTTS && (
          <button onClick={onTTS} className="rounded-lg p-1 text-text-secondary hover:text-primary">
            <Volume2 className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="space-y-3" style={{ minHeight: "240px" }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={!!selected}
            className={`w-full rounded-xl border p-4 text-left font-medium transition-colors h-14 ${
              selected === opt
                ? opt === correct
                  ? "border-green-500 bg-green-500/10 text-green-400"
                  : "border-red-500 bg-red-500/10 text-red-400"
                : selected && opt === correct
                  ? "border-green-500 bg-green-500/10 text-green-400"
                  : "border-white/10 bg-surface-container-high hover:border-primary/50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function FillGapExercise({ sentence, answer, translation, distractors, onResult }: {
  sentence: string;
  answer: string;
  translation: string;
  distractors: string[];
  onResult: (correct: boolean) => void;
}) {
  const options = shuffle([answer, ...distractors]);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => onResult(opt === answer), 600);
  };

  return (
    <div className="text-center">
      <p className="mb-2 text-sm text-text-secondary">Uzupełnij zdanie</p>
      <div className="mb-2 text-xl font-bold">
        {sentence.replace("____", selected ? `[${selected}]` : "____")}
      </div>
      <div className="mb-6 text-sm text-text-secondary">{translation}</div>
      <div className="flex flex-wrap justify-center gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={!!selected}
            className={`rounded-xl border px-6 py-3 font-medium transition-all ${
              selected === opt
                ? opt === answer
                  ? "border-green-500 bg-green-500/10 text-green-400"
                  : "border-red-500 bg-red-500/10 text-red-400"
                : "border-border bg-bg-card hover:border-primary/50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function WordOrderExercise({ translationPl, words, correctOrder, onResult }: {
  translationPl: string;
  words: string[];
  correctOrder: string[];
  onResult: (correct: boolean) => void;
}) {
  const [placed, setPlaced] = useState<string[]>([]);
  const shuffled = shuffle(words);
  const remaining = shuffled.filter((w) => !placed.includes(w));

  const addWord = (w: string) => {
    const next = [...placed, w];
    setPlaced(next);
    if (next.length === words.length) {
      const correct = next.join(" ") === correctOrder.join(" ");
      setTimeout(() => onResult(correct), 600);
    }
  };

  const removeWord = (i: number) => {
    setPlaced((prev) => prev.filter((_, j) => j !== i));
  };

  return (
    <div className="text-center">
      <p className="mb-2 text-sm text-text-secondary">Ułóż zdanie</p>
      <div className="mb-6 text-lg font-medium text-text-secondary">{translationPl}</div>

      {/* Placed words */}
      <div className="mb-6 flex min-h-[48px] flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-bg-card p-3">
        {placed.length === 0 && <span className="text-sm text-text-secondary">Kliknij słowa poniżej...</span>}
        {placed.map((w, i) => (
          <button key={i} onClick={() => removeWord(i)} className="rounded-lg bg-primary/20 px-3 py-1.5 text-sm font-medium text-primary">
            {w}
          </button>
        ))}
      </div>

      {/* Available words */}
      <div className="flex flex-wrap justify-center gap-2">
        {remaining.map((w, i) => (
          <button key={i} onClick={() => addWord(w)} className="rounded-lg border border-border bg-bg-card px-4 py-2 text-sm font-medium hover:border-primary/50">
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchingExercise({ pairs, onResult }: {
  pairs: MatchPair[];
  onResult: (correct: boolean) => void;
}) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [shuffledTranslations] = useState(() => shuffle(pairs.map((p) => p.translation)));

  const handleWordClick = (word: string) => {
    if (matched.includes(word)) return;
    setSelectedWord(word);
  };

  const handleTranslationClick = (translation: string) => {
    if (!selectedWord || matched.includes(selectedWord)) return;
    const pair = pairs.find((p) => p.word === selectedWord);
    if (pair?.translation === translation) {
      const newMatched = [...matched, selectedWord];
      setMatched(newMatched);
      setSelectedWord(null);
      if (newMatched.length === pairs.length) {
        setTimeout(() => onResult(true), 500);
      }
    } else {
      setSelectedWord(null);
    }
  };

  return (
    <div className="text-center">
      <p className="mb-6 text-sm text-text-secondary">Dopasuj pary</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {pairs.map((p) => (
            <button
              key={p.word}
              onClick={() => handleWordClick(p.word)}
              disabled={matched.includes(p.word)}
              className={`w-full rounded-xl border p-3 text-sm font-medium transition-all ${
                matched.includes(p.word)
                  ? "border-green-500/30 bg-green-500/10 text-green-400 opacity-50"
                  : selectedWord === p.word
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-bg-card hover:border-primary/50"
              }`}
            >
              {p.word}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {shuffledTranslations.map((t) => {
            const isMatched = pairs.some((p) => p.translation === t && matched.includes(p.word));
            return (
              <button
                key={t}
                onClick={() => handleTranslationClick(t)}
                disabled={isMatched}
                className={`w-full rounded-xl border p-3 text-sm transition-all ${
                  isMatched
                    ? "border-green-500/30 bg-green-500/10 text-green-400 opacity-50"
                    : "border-border bg-bg-card hover:border-primary/50"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ListeningExercise({ word, language, correct, options, onResult, onTTS }: {
  word: string;
  language: string;
  correct: string;
  options: string[];
  onResult: (correct: boolean) => void;
  onTTS: (text: string, lang: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [played, setPlayed] = useState(false);

  const play = () => {
    onTTS(word, language);
    setPlayed(true);
  };

  const handleSelect = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => onResult(opt === correct), 600);
  };

  return (
    <div className="text-center">
      <p className="mb-4 text-sm text-text-secondary">Co słyszysz?</p>

      <button
        onClick={play}
        className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary/30"
      >
        <Volume2 className="h-8 w-8" />
      </button>

      {!played && <p className="mb-4 text-sm text-text-secondary">Kliknij żeby odsłuchać</p>}

      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={!!selected || !played}
            className={`w-full rounded-xl border p-4 text-left font-medium transition-all ${
              !played ? "opacity-50 border-border bg-bg-card" :
              selected === opt
                ? opt === correct
                  ? "border-green-500 bg-green-500/10 text-green-400"
                  : "border-red-500 bg-red-500/10 text-red-400"
                : selected && opt === correct
                  ? "border-green-500 bg-green-500/10 text-green-400"
                  : "border-border bg-bg-card hover:border-primary/50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

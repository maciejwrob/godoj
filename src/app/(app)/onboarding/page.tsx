"use client";

import { useState, useEffect, useTransition } from "react";
import { saveOnboarding, type OnboardingData } from "./actions";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
} from "lucide-react";
import { LogoFull } from "@/components/logo";

const TOTAL_STEPS = 8;

const NATIVE_LANGUAGES = [
  { id: "pl", name: "Polski", flag: "🇵🇱" },
  { id: "en", name: "Angielski", flag: "🇬🇧" },
  { id: "uk", name: "Ukraiński", flag: "🇺🇦" },
  { id: "other", name: "Inne", flag: "🌍" },
];

// -- Data definitions --

type Language = {
  id: string;
  name: string;
  flag: string;
  active: boolean;
  variants?: { id: string; name: string; flag: string }[];
};

const LANGUAGES: Language[] = [
  { id: "no", name: "Norweski", flag: "\uD83C\uDDF3\uD83C\uDDF4", active: true },
  { id: "fr", name: "Francuski", flag: "\uD83C\uDDEB\uD83C\uDDF7", active: true },
  {
    id: "es",
    name: "Hiszpanski",
    flag: "\uD83C\uDDEA\uD83C\uDDF8",
    active: true,
    variants: [
      { id: "european", name: "Europejski", flag: "\uD83C\uDDEA\uD83C\uDDF8" },
      { id: "es-LATAM", name: "Latynoamerykanski", flag: "\uD83C\uDDF2\uD83C\uDDFD" },
    ],
  },
  {
    id: "en",
    name: "Angielski",
    flag: "\uD83C\uDDEC\uD83C\uDDE7",
    active: true,
    variants: [
      { id: "american", name: "Amerykanski", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
      { id: "british", name: "Brytyjski", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
    ],
  },
  { id: "it", name: "Wloski", flag: "\uD83C\uDDEE\uD83C\uDDF9", active: true },
  { id: "sv", name: "Szwedzki", flag: "\uD83C\uDDF8\uD83C\uDDEA", active: true },
  { id: "de", name: "Niemiecki", flag: "\uD83C\uDDE9\uD83C\uDDEA", active: true },
  { id: "fi", name: "Finski", flag: "\uD83C\uDDEB\uD83C\uDDEE", active: true },
  { id: "pt", name: "Portugalski", flag: "\uD83C\uDDF5\uD83C\uDDF9", active: false },
  { id: "hu", name: "Wegierski", flag: "\uD83C\uDDED\uD83C\uDDFA", active: false },
];

const LEVELS = [
  {
    id: "A1",
    name: "Początkujący",
    label: "A1",
    desc: "Znam tylko podstawowe słowa",
  },
  {
    id: "A2",
    name: "Elementarny",
    label: "A2",
    desc: "Radzę sobie z prostymi rozmowami",
  },
  {
    id: "B1",
    name: "Średnio zaawansowany",
    label: "B1",
    desc: "Mogę rozmawiać o znanych tematach",
  },
  {
    id: "B2",
    name: "Zaawansowany",
    label: "B2",
    desc: "Czuję się dość swobodnie",
  },
  {
    id: "C1",
    name: "Biegły",
    label: "C1",
    desc: "Chcę szlifować umiejętności",
  },
];

const GOALS = [
  { id: "travel", icon: "✈️", label: "Podróże i turystyka" },
  { id: "work", icon: "💼", label: "Praca i biznes" },
  { id: "relocation", icon: "🏠", label: "Przeprowadzka za granicę" },
  { id: "family", icon: "👥", label: "Rozmowy z rodziną / znajomymi" },
  { id: "school", icon: "🎓", label: "Szkoła / Studia" },
  { id: "fun", icon: "🌟", label: "Dla przyjemności" },
];

const INTERESTS = [
  { id: "sport", icon: "⚽", label: "Sport" },
  { id: "cooking", icon: "🍕", label: "Gotowanie" },
  { id: "tech", icon: "💻", label: "Technologia" },
  { id: "film", icon: "🎬", label: "Film i TV" },
  { id: "music", icon: "🎵", label: "Muzyka" },
  { id: "travel", icon: "✈️", label: "Podróże" },
  { id: "nature", icon: "🌿", label: "Natura" },
  { id: "politics", icon: "📰", label: "Polityka" },
  { id: "business", icon: "📊", label: "Biznes" },
  { id: "art", icon: "🎨", label: "Sztuka" },
  { id: "science", icon: "🔬", label: "Nauka" },
  { id: "gaming", icon: "🎮", label: "Gaming" },
  { id: "fashion", icon: "👗", label: "Moda" },
  { id: "cars", icon: "🚗", label: "Motoryzacja" },
  { id: "fitness", icon: "💪", label: "Fitness" },
];

const DURATIONS = [5, 10, 15, 20, 30];
const FREQUENCIES = [
  { id: "daily", label: "Codziennie" },
  { id: "3-4x", label: "3-4x w tygodniu" },
  { id: "2-3x", label: "2-3x w tygodniu" },
  { id: "1x", label: "Raz w tygodniu" },
];
const TIMES = [
  { id: "morning", icon: "🌅", label: "Rano" },
  { id: "day", icon: "☀️", label: "W ciągu dnia" },
  { id: "evening", icon: "🌙", label: "Wieczorem" },
  { id: "any", icon: "🤷", label: "Bez preferencji" },
];

type TutorDef = { id: string; name: string; desc: string; lang: string };

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [nativeLang, setNativeLang] = useState("pl");
  const [selectedLang, setSelectedLang] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [showVariants, setShowVariants] = useState(false);
  const [level, setLevel] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [duration, setDuration] = useState(15);
  const [frequency, setFrequency] = useState("3-4x");
  const [time, setTime] = useState("any");
  const [reminders, setReminders] = useState(false);
  const [tutor, setTutor] = useState<string | null>(null);
  const [availableTutors, setAvailableTutors] = useState<TutorDef[]>([]);

  const selectedLanguage = LANGUAGES.find((l) => l.id === selectedLang);

  // Load available tutors from agents_config when language changes
  useEffect(() => {
    if (!selectedLang) return;
    setTutor(null);
    const supabase = createClient();
    supabase
      .from("agents_config")
      .select("id, voice_name, voice_description, language")
      .eq("language", selectedLang)
      .eq("audience", "adult")
      .eq("is_active", true)
      .then(({ data }) => {
        setAvailableTutors(
          (data ?? []).map((a) => ({
            id: a.id,
            name: a.voice_name,
            desc: a.voice_description ?? "",
            lang: a.language,
          }))
        );
      });
  }, [selectedLang]);

  const canProceed = () => {
    switch (step) {
      case 1:
        return displayName.trim().length >= 2;
      case 2:
        return !!nativeLang;
      case 3:
        if (!selectedLang) return false;
        if (selectedLanguage?.variants && !selectedVariant) return false;
        return true;
      case 4:
        return !!level;
      case 5:
        return goals.length >= 1;
      case 6:
        return interests.length >= 2;
      case 7:
        return true;
      case 8:
        return !!tutor;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (step < TOTAL_STEPS) {
      setDirection("forward");
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setDirection("back");
      setStep(step - 1);
    }
  };

  const handleLanguageSelect = (lang: Language) => {
    if (!lang.active) return;
    setSelectedLang(lang.id);
    setSelectedVariant(null);
    if (lang.variants) {
      setShowVariants(true);
    } else {
      setShowVariants(false);
    }
  };

  const toggleMulti = (
    id: string,
    list: string[],
    setter: (v: string[]) => void
  ) => {
    setter(
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
    );
  };

  const handleSave = () => {
    setError("");
    // Pre-set localStorage so dashboard uses the correct language immediately
    localStorage.setItem("godoj_active_lang", selectedLang);
    startTransition(async () => {
      const data: OnboardingData = {
        displayName: displayName.trim(),
        nativeLanguage: nativeLang,
        targetLanguage: selectedLang,
        languageVariant: selectedVariant,
        currentLevel: level,
        learningGoals: goals,
        interests,
        preferredDurationMin: duration,
        preferredFrequency: frequency,
        preferredTime: time,
        remindersEnabled: reminders,
        selectedAgentId: tutor,
      };

      const result = await saveOnboarding(data);
      if (result && !result.success) {
        setError(result.error);
      }
    });
  };

  const filteredTutors = availableTutors;

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 flex items-center justify-center">
          <LogoFull size={32} href="/onboarding" />
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-2 text-center text-sm text-text-secondary">
            Krok {step} z {TOTAL_STEPS}
          </div>
          <div className="h-2 w-full rounded-full bg-bg-card">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div
          key={step}
          className={`animate-${direction === "forward" ? "slide-in-right" : "slide-in-left"}`}
        >
          {step === 1 && (
            <StepName value={displayName} onChange={setDisplayName} />
          )}
          {step === 2 && (
            <StepNativeLanguage
              languages={NATIVE_LANGUAGES}
              selected={nativeLang}
              onSelect={setNativeLang}
            />
          )}
          {step === 3 && (
            <StepLanguage
              languages={LANGUAGES}
              selected={selectedLang}
              variant={selectedVariant}
              showVariants={showVariants}
              selectedLanguage={selectedLanguage}
              onSelect={handleLanguageSelect}
              onVariant={setSelectedVariant}
            />
          )}
          {step === 4 && (
            <StepLevel levels={LEVELS} selected={level} onSelect={setLevel} />
          )}
          {step === 5 && (
            <StepGoals
              goals={GOALS}
              selected={goals}
              onToggle={(id) => toggleMulti(id, goals, setGoals)}
            />
          )}
          {step === 6 && (
            <StepInterests
              interests={INTERESTS}
              selected={interests}
              onToggle={(id) => toggleMulti(id, interests, setInterests)}
            />
          )}
          {step === 7 && (
            <StepPreferences
              duration={duration}
              frequency={frequency}
              time={time}
              reminders={reminders}
              onDuration={setDuration}
              onFrequency={setFrequency}
              onTime={setTime}
              onReminders={setReminders}
            />
          )}
          {step === 8 && (
            <StepTutor
              tutors={filteredTutors}
              selected={tutor}
              onSelect={setTutor}
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            onClick={goBack}
            disabled={step === 1}
            className="flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm text-text-secondary transition-colors hover:text-text-primary disabled:invisible"
          >
            <ArrowLeft className="h-4 w-4" />
            Wstecz
          </button>

          {step < TOTAL_STEPS ? (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-1 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
            >
              Dalej
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!canProceed() || isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Rozpocznij naukę
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

// -- Step components --

function StepName({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Jak masz na imię?</h2>
      <p className="mb-6 text-text-secondary">
        Tutor będzie się do Ciebie zwracał po imieniu
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Twoje imię"
        autoFocus
        className="w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-lg text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

function StepNativeLanguage({
  languages,
  selected,
  onSelect,
}: {
  languages: typeof NATIVE_LANGUAGES;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Jaki jest Twój język ojczysty?</h2>
      <p className="mb-6 text-text-secondary">
        Dzięki temu tutor będzie mógł tłumaczyć w Twoim języku
      </p>

      <div className="space-y-3">
        {languages.map((lang) => (
          <button
            key={lang.id}
            onClick={() => onSelect(lang.id)}
            className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              selected === lang.id
                ? "border-primary bg-primary/10"
                : "border-border bg-bg-card hover:border-primary/50"
            }`}
          >
            <span className="text-2xl">{lang.flag}</span>
            <span className="font-medium">{lang.name}</span>
            {selected === lang.id && (
              <Check className="ml-auto h-5 w-5 text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepLanguage({
  languages,
  selected,
  variant,
  showVariants,
  selectedLanguage,
  onSelect,
  onVariant,
}: {
  languages: Language[];
  selected: string;
  variant: string | null;
  showVariants: boolean;
  selectedLanguage: Language | undefined;
  onSelect: (l: Language) => void;
  onVariant: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Jakiego języka chcesz się uczyć?</h2>
      <p className="mb-6 text-text-secondary">Wybierz język, w którym chcesz rozmawiać</p>

      <div className="grid grid-cols-2 gap-3">
        {languages.map((lang) => (
          <button
            key={lang.id}
            onClick={() => onSelect(lang)}
            disabled={!lang.active}
            className={`relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              selected === lang.id
                ? "border-primary bg-primary/10"
                : lang.active
                  ? "border-border bg-bg-card hover:border-primary/50"
                  : "cursor-not-allowed border-border/50 bg-bg-card/50 opacity-50"
            }`}
          >
            <span className="text-2xl">{lang.flag}</span>
            <span className="font-medium">{lang.name}</span>
            {!lang.active && (
              <span className="absolute right-2 top-2 rounded-full bg-bg-card-hover px-2 py-0.5 text-[10px] text-text-secondary">
                Wkrótce
              </span>
            )}
          </button>
        ))}
      </div>

      {showVariants && selectedLanguage?.variants && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-text-secondary">Wybierz wariant:</p>
          <div className="flex gap-3">
            {selectedLanguage.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => onVariant(v.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border p-4 transition-all ${
                  variant === v.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-bg-card hover:border-primary/50"
                }`}
              >
                <span className="text-xl">{v.flag}</span>
                <span className="font-medium">{v.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepLevel({
  levels,
  selected,
  onSelect,
}: {
  levels: typeof LEVELS;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Jaki jest Twój poziom?</h2>
      <p className="mb-6 text-text-secondary">Pomoże nam to dostosować rozmowy do Ciebie</p>

      <div className="space-y-3">
        {levels.map((l) => (
          <button
            key={l.id}
            onClick={() => onSelect(l.id)}
            className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
              selected === l.id
                ? "border-primary bg-primary/10"
                : "border-border bg-bg-card hover:border-primary/50"
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-card-hover text-sm font-bold">
              {l.label}
            </span>
            <div>
              <div className="font-medium">{l.name}</div>
              <div className="text-sm text-text-secondary">{l.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-text-secondary">
        Nie martw się — AI dostosuje poziom automatycznie w trakcie rozmów
      </p>
    </div>
  );
}

function StepGoals({
  goals,
  selected,
  onToggle,
}: {
  goals: typeof GOALS;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Dlaczego się uczysz?</h2>
      <p className="mb-6 text-text-secondary">Wybierz co najmniej jeden cel</p>

      <div className="grid grid-cols-1 gap-3">
        {goals.map((g) => (
          <button
            key={g.id}
            onClick={() => onToggle(g.id)}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              selected.includes(g.id)
                ? "border-primary bg-primary/10"
                : "border-border bg-bg-card hover:border-primary/50"
            }`}
          >
            <span className="text-2xl">{g.icon}</span>
            <span className="font-medium">{g.label}</span>
            {selected.includes(g.id) && (
              <Check className="ml-auto h-5 w-5 text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepInterests({
  interests,
  selected,
  onToggle,
}: {
  interests: typeof INTERESTS;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Twoje zainteresowania</h2>
      <p className="mb-6 text-text-secondary">
        Wybierz co najmniej 2 — pomogą nam prowadzić ciekawsze rozmowy
      </p>

      <div className="flex flex-wrap gap-2">
        {interests.map((i) => (
          <button
            key={i.id}
            onClick={() => onToggle(i.id)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-all ${
              selected.includes(i.id)
                ? "border-primary bg-primary/10 text-text-primary"
                : "border-border bg-bg-card text-text-secondary hover:border-primary/50"
            }`}
          >
            <span>{i.icon}</span>
            <span>{i.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepPreferences({
  duration,
  frequency,
  time,
  reminders,
  onDuration,
  onFrequency,
  onTime,
  onReminders,
}: {
  duration: number;
  frequency: string;
  time: string;
  reminders: boolean;
  onDuration: (v: number) => void;
  onFrequency: (v: string) => void;
  onTime: (v: string) => void;
  onReminders: (v: boolean) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Preferencje nauki</h2>
        <p className="text-text-secondary">Dostosuj plan do swojego stylu życia</p>
      </div>

      {/* Duration */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-text-secondary">
          Czas trwania lekcji
        </h3>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => onDuration(d)}
              className={`flex-1 rounded-lg border py-2.5 text-center text-sm font-medium transition-all ${
                duration === d
                  ? "border-primary bg-primary/10 text-text-primary"
                  : "border-border bg-bg-card text-text-secondary hover:border-primary/50"
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      {/* Frequency */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-text-secondary">
          Częstotliwość
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.id}
              onClick={() => onFrequency(f.id)}
              className={`rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-all ${
                frequency === f.id
                  ? "border-primary bg-primary/10 text-text-primary"
                  : "border-border bg-bg-card text-text-secondary hover:border-primary/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time of day */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-text-secondary">
          Pora dnia
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {TIMES.map((t) => (
            <button
              key={t.id}
              onClick={() => onTime(t.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                time === t.id
                  ? "border-primary bg-primary/10 text-text-primary"
                  : "border-border bg-bg-card text-text-secondary hover:border-primary/50"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reminders */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-bg-card p-4">
        <span className="text-sm font-medium">
          Wysyłaj mi przypomnienia o lekcjach
        </span>
        <button
          onClick={() => onReminders(!reminders)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            reminders ? "bg-primary" : "bg-bg-card-hover"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              reminders ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function StepTutor({
  tutors,
  selected,
  onSelect,
}: {
  tutors: TutorDef[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Wybierz tutora</h2>
      <p className="mb-6 text-text-secondary">
        Z kim chcesz rozmawiać? Każdy ma unikalny styl
      </p>

      <div className="space-y-3">
        {tutors.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
              selected === t.id
                ? "border-primary bg-primary/10"
                : "border-border bg-bg-card hover:border-primary/50"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
              {t.name[0]}
            </div>
            <div className="flex-1">
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-text-secondary">{t.desc}</div>
            </div>
            {selected === t.id && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </button>
        ))}
      </div>

      {tutors.length === 0 && (
        <div className="rounded-xl border border-border bg-bg-card p-6 text-center text-text-secondary">
          Tutorzy dla tego języka będą dostępni wkrótce
        </div>
      )}

      <p className="mt-4 text-center text-xs text-text-secondary">
        Możesz zmienić tutora w każdej chwili w ustawieniach
      </p>
    </div>
  );
}

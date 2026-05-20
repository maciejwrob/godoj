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
import { UILanguageToggle } from "@/components/ui-language-toggle";
import { getLocalizedLevels, getLocalizedGoals, getLocalizedInterests } from "@/config/onboarding-data";
import { useTranslation } from "@/lib/i18n";

const TOTAL_STEPS = 5;

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
    name: "Hiszpański",
    flag: "\uD83C\uDDEA\uD83C\uDDF8",
    active: true,
    variants: [
      { id: "european", name: "Europejski", flag: "\uD83C\uDDEA\uD83C\uDDF8" },
      { id: "es-LATAM", name: "Latynoamerykański", flag: "\uD83C\uDDF2\uD83C\uDDFD" },
    ],
  },
  {
    id: "en",
    name: "Angielski",
    flag: "\uD83C\uDDEC\uD83C\uDDE7",
    active: true,
    variants: [
      { id: "american", name: "Amerykański", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
      { id: "british", name: "Brytyjski", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
    ],
  },
  { id: "it", name: "Włoski", flag: "\uD83C\uDDEE\uD83C\uDDF9", active: true },
  { id: "sv", name: "Szwedzki", flag: "\uD83C\uDDF8\uD83C\uDDEA", active: true },
  { id: "de", name: "Niemiecki", flag: "\uD83C\uDDE9\uD83C\uDDEA", active: true },
  { id: "fi", name: "Fiński", flag: "\uD83C\uDDEB\uD83C\uDDEE", active: true },
  { id: "ko", name: "Koreański 한국어", flag: "🇰🇷", active: true },
  { id: "pt", name: "Portugalski", flag: "\uD83C\uDDF5\uD83C\uDDF9", active: false },
  { id: "hu", name: "Węgierski", flag: "\uD83C\uDDED\uD83C\uDDFA", active: false },
];

type TutorDef = { id: string; name: string; desc: string; lang: string };

export default function OnboardingPage() {
  const { t, locale, setLocale } = useTranslation();

  const LEVELS = getLocalizedLevels(locale);
  const GOALS = getLocalizedGoals(locale);
  const INTERESTS = getLocalizedInterests(locale);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [waitlisted, setWaitlisted] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [selectedLang, setSelectedLang] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [showVariants, setShowVariants] = useState(false);
  const [level, setLevel] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [tutor, setTutor] = useState<string | null>(null);
  const [availableTutors, setAvailableTutors] = useState<TutorDef[]>([]);

  const selectedLanguage = LANGUAGES.find((l) => l.id === selectedLang);

  // Load available tutors from agents_config when language/variant changes
  useEffect(() => {
    if (!selectedLang) return;
    setTutor(null);
    const supabase = createClient();
    let query = supabase
      .from("agents_config")
      .select("id, voice_name, voice_description, language, variant")
      .eq("language", selectedLang)
      .eq("audience", "adult")
      .eq("is_active", true);

    // Filter by variant if one is selected (e.g. american, british)
    if (selectedVariant) {
      query = query.eq("variant", selectedVariant);
    }

    query.then(({ data }) => {
      setAvailableTutors(
        (data ?? []).map((a) => ({
          id: a.id,
          name: a.voice_name,
          desc: a.voice_description ?? "",
          lang: a.language,
        }))
      );
    });
  }, [selectedLang, selectedVariant]);

  const canProceed = () => {
    switch (step) {
      case 1: // Name
        return displayName.trim().length >= 2;
      case 2: // Target language
        if (!selectedLang) return false;
        if (selectedLanguage?.variants && !selectedVariant) return false;
        return true;
      case 3: // Level
        return !!level;
      case 4: // Goals + Interests
        return goals.length >= 1 && interests.length >= 1;
      case 5: // Tutor
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
      // Derive native language from UI locale
      const derivedNativeLang = locale === "pl" ? "pl" : "en";
      const data: OnboardingData = {
        displayName: displayName.trim(),
        nativeLanguage: derivedNativeLang,
        targetLanguage: selectedLang,
        languageVariant: selectedVariant,
        currentLevel: level,
        learningGoals: goals,
        interests,
        preferredDurationMin: 10,
        preferredFrequency: "3-4x",
        preferredTime: "any",
        remindersEnabled: false,
        selectedAgentId: tutor,
        uiLanguage: locale,
      };

      const result = await saveOnboarding(data);
      if (result && !result.success) {
        if (result.error === "WAITLIST") {
          setWaitlisted(true);
          return;
        }
        setError(result.error);
        return;
      }
      // Full page reload to force fresh server render with new profile data
      window.location.href = "/dashboard";
    });
  };

  const filteredTutors = availableTutors;

  if (waitlisted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md text-center space-y-6">
          <LogoFull size={40} />
          <div className="text-5xl">🙏</div>
          <h1 className="text-2xl font-bold">
            {locale === "pl" ? "Beta jest tymczasowo pełna" : "Beta is temporarily full"}
          </h1>
          <p className="text-text-secondary leading-relaxed">
            {locale === "pl"
              ? "Zapisaliśmy Twojego maila — odezwę się osobiście, gdy zwolni się miejsce."
              : "We've saved your email — I'll personally reach out when a spot opens up."}
          </p>
          <div className="rounded-xl border border-border bg-bg-card p-4 text-sm text-text-secondary">
            {locale === "pl"
              ? "Tu Maciek, daj znać czy chcesz żebym Ci zarezerwował kolejne miejsce:"
              : "— Maciek, reach me at:"}
            <br />
            <a href="mailto:maciej@godoj.co" className="text-primary font-medium">maciej@godoj.co</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <LogoFull size={32} href="/onboarding" />
          <UILanguageToggle />
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-2 text-center text-sm text-text-secondary">
            {t("step")} {step} {t("of")} {TOTAL_STEPS}
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
          {step === 3 && (
            <StepLevel levels={LEVELS} selected={level} onSelect={setLevel} />
          )}
          {step === 4 && (
            <StepGoalsAndInterests
              goals={GOALS}
              interests={INTERESTS}
              selectedGoals={goals}
              selectedInterests={interests}
              onToggleGoal={(id) => toggleMulti(id, goals, setGoals)}
              onToggleInterest={(id) => toggleMulti(id, interests, setInterests)}
            />
          )}
          {step === 5 && (
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
            {t("back")}
          </button>

          {step < TOTAL_STEPS ? (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-1 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
            >
              {t("next")}
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
              {t("startLearning")}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

// -- Step components --

function StepName({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">{t("whatsYourName")}</h2>
      <p className="mb-6 text-text-secondary">
        {t("nameHint")}
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("yourNamePlaceholder")}
        autoFocus
        className="w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-lg text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
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
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">{t("targetLangQuestion")}</h2>
      <p className="mb-6 text-text-secondary">{t("targetLangHint")}</p>

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
                {t("comingSoon")}
              </span>
            )}
          </button>
        ))}
      </div>

      {showVariants && selectedLanguage?.variants && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-text-secondary">{t("chooseVariant")}</p>
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
  levels: { id: string; name: string; label: string; desc: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">{t("levelQuestion")}</h2>
      <p className="mb-6 text-text-secondary">{t("levelHint")}</p>

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

function StepGoalsAndInterests({
  goals,
  interests,
  selectedGoals,
  selectedInterests,
  onToggleGoal,
  onToggleInterest,
}: {
  goals: { id: string; icon: string; label: string }[];
  interests: { id: string; icon: string; label: string }[];
  selectedGoals: string[];
  selectedInterests: string[];
  onToggleGoal: (id: string) => void;
  onToggleInterest: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      {/* Goals */}
      <div>
        <h2 className="mb-2 text-2xl font-bold">{t("goalsQuestion")}</h2>
        <p className="mb-4 text-text-secondary">{t("goalsHint")}</p>
        <div className="grid grid-cols-2 gap-2">
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => onToggleGoal(g.id)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-all ${
                selectedGoals.includes(g.id)
                  ? "border-primary bg-primary/10"
                  : "border-border bg-bg-card hover:border-primary/50"
              }`}
            >
              <span className="text-lg">{g.icon}</span>
              <span className="font-medium">{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div>
        <h3 className="mb-2 text-lg font-bold">{t("interestsQuestion")}</h3>
        <p className="mb-4 text-sm text-text-secondary">{t("interestsHint")}</p>
        <div className="flex flex-wrap gap-2">
          {interests.map((i) => (
            <button
              key={i.id}
              onClick={() => onToggleInterest(i.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-all ${
                selectedInterests.includes(i.id)
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
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">{t("chooseTutor")}</h2>
      <p className="mb-6 text-text-secondary">
        {t("chooseTutorHint")}
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
          {t("tutorsComingSoon")}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-text-secondary">
        {t("changeTutorLater")}
      </p>
    </div>
  );
}

// Kids mode utilities — theme, levels, and agent prompt helpers
import type { AgeGroup, KidsTheme } from "@/types/kids";

export function isKidsMode(userProfile: { is_kids_mode?: boolean }): boolean {
  return userProfile.is_kids_mode === true;
}

export const KIDS_THEME = {
  bgColor: "#FFF8F0",
  cardBg: "#FFF0E0",
  accent: "#FF6B35",
  accentLight: "#FFB088",
  textPrimary: "#2D1B0E",
  textSecondary: "#8B6B4A",
  border: "#FFD4B0",
} as const;

export const KIDS_LEVELS: Record<
  string,
  { cefr: string; emoji: string; label: string }
> = {
  beginner: { cefr: "A1", emoji: "\u{1F331}", label: "Uczę się od początku" },
  intermediate: { cefr: "A2", emoji: "\u{1F33F}", label: "Znam trochę" },
  advanced: { cefr: "B1", emoji: "\u{1F333}", label: "Znam całkiem dobrze" },
};

export const THEME_CONFIG: Record<
  KidsTheme,
  {
    label: string;
    emoji: string;
    description: string;
    bg: string;
    bgAlt: string;
    primary: string;
    accent: string;
    heroBg: string;
    dotColor: string;
    isDark: boolean;
    heroEmoji: string;
    textColor: string;
    textSecondary: string;
  }
> = {
  castle: {
    label: "Magiczny zamek",
    emoji: "🏰",
    description: "Wróżki, korony i magiczne zaklęcia",
    bg: "#fff4f4",
    bgAlt: "#f8e8ff",
    primary: "#a02d70",
    accent: "#fcc025",
    heroBg: "linear-gradient(135deg, #f472b6, #a855f7)",
    dotColor: "#f472b6",
    isDark: false,
    heroEmoji: "🏰",
    textColor: "#1a0a12",
    textSecondary: "#7b3a5a",
  },
  jungle: {
    label: "Przygoda w dżungli",
    emoji: "🦕",
    description: "Dinozaury, skarby i dzika przyroda",
    bg: "#edfaf1",
    bgAlt: "#dcfce7",
    primary: "#006947",
    accent: "#fd9e70",
    heroBg: "linear-gradient(135deg, #22c55e, #059669)",
    dotColor: "#22c55e",
    isDark: false,
    heroEmoji: "🦕",
    textColor: "#052e16",
    textSecondary: "#166534",
  },
  space: {
    label: "Kosmiczna misja",
    emoji: "🚀",
    description: "Rakiety, roboty i gwiezdne podróże",
    bg: "#0f0f2e",
    bgAlt: "#1a1a3e",
    primary: "#7c3aed",
    accent: "#22d3ee",
    heroBg: "linear-gradient(135deg, #4c1d95, #6d28d9)",
    dotColor: "#7c3aed",
    isDark: true,
    heroEmoji: "🚀",
    textColor: "#f0f0ff",
    textSecondary: "#a5b4fc",
  },
};

export function getAgeGroup(dateOfBirth: string): AgeGroup {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  if (age <= 6) return "4-6";
  if (age <= 9) return "7-9";
  return "10-12";
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function setActiveChild(childId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("godoj_active_child_id", childId);
  document.cookie = `godoj_active_child_id=${childId}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearActiveChild(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("godoj_active_child_id");
  document.cookie =
    "godoj_active_child_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

export function kidsFluencyLabel(score: number): {
  emoji: string;
  label: string;
} {
  if (score >= 4) return { emoji: "\u{1F60A}", label: "Świetnie!" };
  if (score >= 3) return { emoji: "\u{1F603}", label: "Dobrze!" };
  return { emoji: "\u{1F642}", label: "Fajnie!" };
}

/**
 * System prompt template for the kids conversational agent.
 *
 * Supported variables (use {{variable}} syntax):
 * - {{child_name}}      — child's display name
 * - {{target_language}}  — language being learned (e.g. "angielski")
 * - {{native_language}}  — child's native language (e.g. "polski")
 * - {{level}}            — CEFR level (A1/A2/B1)
 * - {{level_label}}      — kid-friendly level description
 * - {{topic}}            — lesson topic, if any
 */
export const KIDS_AGENT_PROMPT_TEMPLATE = `Jesteś przyjaznym nauczycielem języka {{target_language}} dla dzieci. Rozmawiasz z dzieckiem o imieniu {{child_name}}.

Zasady:
- Mów prostym językiem, dostosowanym do poziomu {{level}} ({{level_label}}).
- Bądź cierpliwy, zachęcający i pełen entuzjazmu.
- Używaj krótkich zdań i prostych słów.
- Chwal za każdą próbę — nawet jeśli odpowiedź nie jest idealna.
- Jeśli dziecko nie rozumie, powtórz prościej lub wyjaśnij po {{native_language}}.
- Nie poprawiaj błędów bezpośrednio — zamiast tego powtórz poprawną formę naturalnie w swojej odpowiedzi.
- Staraj się prowadzić rozmowę wokół tematu: {{topic}}.
- Mieszaj {{target_language}} z {{native_language}} w proporcji odpowiedniej do poziomu dziecka.
- Na poziomie A1: głównie {{native_language}} z pojedynczymi słowami w {{target_language}}.
- Na poziomie A2: proste zdania w {{target_language}}, wyjaśnienia po {{native_language}}.
- Na poziomie B1: głównie {{target_language}}, {{native_language}} tylko gdy dziecko potrzebuje pomocy.
- Używaj emoji i zabawnych porównań, żeby utrzymać zaangażowanie dziecka.`;

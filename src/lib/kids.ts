// Kids mode utilities — theme, levels, and agent prompt helpers

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
  beginner: { cefr: "A1", emoji: "\u{1F331}", label: "Ucz\u0119 si\u0119 od pocz\u0105tku" },
  intermediate: { cefr: "A2", emoji: "\u{1F33F}", label: "Znam troch\u0119" },
  advanced: { cefr: "B1", emoji: "\u{1F333}", label: "Znam ca\u0142kiem dobrze" },
};

export function kidsFluencyLabel(score: number): {
  emoji: string;
  label: string;
} {
  if (score >= 4) return { emoji: "\u{1F60A}", label: "\u015Awietnie!" };
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

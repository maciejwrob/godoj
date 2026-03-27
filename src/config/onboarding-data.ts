import type { Locale } from "@/lib/i18n-data";

type LevelDef = { id: string; name: string; label: string; desc: string };
type GoalDef = { id: string; icon: string; label: string };
type InterestDef = { id: string; icon: string; label: string };
type FrequencyDef = { id: string; label: string };
type TimeDef = { id: string; icon: string; label: string };

const LEVELS: Record<Locale, LevelDef[]> = {
  pl: [
    { id: "A1", name: "Początkujący", label: "A1", desc: "Znam tylko podstawowe słowa" },
    { id: "A2", name: "Elementarny", label: "A2", desc: "Radzę sobie z prostymi rozmowami" },
    { id: "B1", name: "Średnio zaawansowany", label: "B1", desc: "Mogę rozmawiać o znanych tematach" },
    { id: "B2", name: "Zaawansowany", label: "B2", desc: "Czuję się dość swobodnie" },
    { id: "C1", name: "Biegły", label: "C1", desc: "Chcę szlifować umiejętności" },
  ],
  en: [
    { id: "A1", name: "Beginner", label: "A1", desc: "I only know basic words" },
    { id: "A2", name: "Elementary", label: "A2", desc: "I can handle simple conversations" },
    { id: "B1", name: "Intermediate", label: "B1", desc: "I can discuss familiar topics" },
    { id: "B2", name: "Upper Intermediate", label: "B2", desc: "I feel fairly comfortable" },
    { id: "C1", name: "Advanced", label: "C1", desc: "I want to polish my skills" },
  ],
};

const GOALS: Record<Locale, GoalDef[]> = {
  pl: [
    { id: "travel", icon: "✈️", label: "Podróże i turystyka" },
    { id: "work", icon: "💼", label: "Praca i biznes" },
    { id: "relocation", icon: "🏠", label: "Przeprowadzka za granicę" },
    { id: "family", icon: "👥", label: "Rozmowy z rodziną / znajomymi" },
    { id: "school", icon: "🎓", label: "Szkoła / Studia" },
    { id: "fun", icon: "🌟", label: "Dla przyjemności" },
  ],
  en: [
    { id: "travel", icon: "✈️", label: "Travel & tourism" },
    { id: "work", icon: "💼", label: "Work & business" },
    { id: "relocation", icon: "🏠", label: "Moving abroad" },
    { id: "family", icon: "👥", label: "Talking with family / friends" },
    { id: "school", icon: "🎓", label: "School / University" },
    { id: "fun", icon: "🌟", label: "For fun" },
  ],
};

const INTERESTS: Record<Locale, InterestDef[]> = {
  pl: [
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
  ],
  en: [
    { id: "sport", icon: "⚽", label: "Sports" },
    { id: "cooking", icon: "🍕", label: "Cooking" },
    { id: "tech", icon: "💻", label: "Technology" },
    { id: "film", icon: "🎬", label: "Film & TV" },
    { id: "music", icon: "🎵", label: "Music" },
    { id: "travel", icon: "✈️", label: "Travel" },
    { id: "nature", icon: "🌿", label: "Nature" },
    { id: "politics", icon: "📰", label: "Politics" },
    { id: "business", icon: "📊", label: "Business" },
    { id: "art", icon: "🎨", label: "Art" },
    { id: "science", icon: "🔬", label: "Science" },
    { id: "gaming", icon: "🎮", label: "Gaming" },
    { id: "fashion", icon: "👗", label: "Fashion" },
    { id: "cars", icon: "🚗", label: "Cars" },
    { id: "fitness", icon: "💪", label: "Fitness" },
  ],
};

const FREQUENCIES: Record<Locale, FrequencyDef[]> = {
  pl: [
    { id: "daily", label: "Codziennie" },
    { id: "3-4x", label: "3-4x w tygodniu" },
    { id: "2-3x", label: "2-3x w tygodniu" },
    { id: "1x", label: "Raz w tygodniu" },
  ],
  en: [
    { id: "daily", label: "Daily" },
    { id: "3-4x", label: "3-4x per week" },
    { id: "2-3x", label: "2-3x per week" },
    { id: "1x", label: "Once a week" },
  ],
};

const TIMES: Record<Locale, TimeDef[]> = {
  pl: [
    { id: "morning", icon: "🌅", label: "Rano" },
    { id: "day", icon: "☀️", label: "W ciągu dnia" },
    { id: "evening", icon: "🌙", label: "Wieczorem" },
    { id: "any", icon: "🤷", label: "Bez preferencji" },
  ],
  en: [
    { id: "morning", icon: "🌅", label: "Morning" },
    { id: "day", icon: "☀️", label: "During the day" },
    { id: "evening", icon: "🌙", label: "Evening" },
    { id: "any", icon: "🤷", label: "No preference" },
  ],
};

export function getLocalizedLevels(locale: Locale) { return LEVELS[locale]; }
export function getLocalizedGoals(locale: Locale) { return GOALS[locale]; }
export function getLocalizedInterests(locale: Locale) { return INTERESTS[locale]; }
export function getLocalizedFrequencies(locale: Locale) { return FREQUENCIES[locale]; }
export function getLocalizedTimes(locale: Locale) { return TIMES[locale]; }

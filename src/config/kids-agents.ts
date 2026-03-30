// Kid-friendly agent personas — used in system prompts and onboarding UI
// ElevenLabs agent IDs are configured in agents_config table (audience='kids')

export interface KidsAgentPersona {
  name: string;
  emoji: string;
  description: string;
  greeting: string; // greeting in native language (Polish) — used in onboarding TTS
}

export const KIDS_AGENT_PERSONAS: Record<string, KidsAgentPersona> = {
  en: {
    name: "Buddy",
    emoji: "🤖",
    description: "Wesoły robot-kumpel, kocha gry i zwierzęta",
    greeting: "Cześć! Jestem Buddy! Będziemy razem uczyć się angielskiego!",
  },
  es: {
    name: "Luna",
    emoji: "🌙",
    description: "Ciekawska odkrywczyni",
    greeting: "Cześć! Jestem Luna! Będziemy razem uczyć się hiszpańskiego!",
  },
  no: {
    name: "Nils",
    emoji: "⚔️",
    description: "Mały wiking-odkrywca",
    greeting: "Cześć! Jestem Nils! Będziemy razem uczyć się norweskiego!",
  },
  fr: {
    name: "Fleur",
    emoji: "🌸",
    description: "Artystka, kocha kolory i muzykę",
    greeting: "Cześć! Jestem Fleur! Będziemy razem uczyć się francuskiego!",
  },
  de: {
    name: "Fritz",
    emoji: "⚙️",
    description: "Wynalazca budujący szalone maszyny",
    greeting: "Cześć! Jestem Fritz! Będziemy razem uczyć się niemieckiego!",
  },
  it: {
    name: "Stella",
    emoji: "⭐",
    description: "Kuchareczka, uczy przez gotowanie",
    greeting: "Cześć! Jestem Stella! Będziemy razem uczyć się włoskiego!",
  },
  sv: {
    name: "Saga",
    emoji: "📖",
    description: "Opowiadaczka bajek z magicznego lasu",
    greeting: "Cześć! Jestem Saga! Będziemy razem uczyć się szwedzkiego!",
  },
  pt: {
    name: "Tito",
    emoji: "🏴‍☠️",
    description: "Pirat-podróżnik szukający skarbów",
    greeting: "Cześć! Jestem Tito! Będziemy razem uczyć się portugalskiego!",
  },
  hu: {
    name: "Mókus",
    emoji: "🐿️",
    description: "Wiewiórka-przewodnik po magicznym lesie",
    greeting: "Cześć! Jestem Mókus! Będziemy razem uczyć się węgierskiego!",
  },
  fi: {
    name: "Lumikki",
    emoji: "❄️",
    description: "Elfka z Laponii, kocha zimowe przygody",
    greeting: "Cześć! Jestem Lumikki! Będziemy razem uczyć się fińskiego!",
  },
};

export const DEFAULT_KIDS_PERSONA: KidsAgentPersona = {
  name: "Kumpel",
  emoji: "😊",
  description: "Twój przyjaciel do nauki języków",
  greeting: "Cześć! Jestem Twoim kumplem do nauki języków!",
};

export function getKidsPersona(langCode: string): KidsAgentPersona {
  return KIDS_AGENT_PERSONAS[langCode] ?? DEFAULT_KIDS_PERSONA;
}

// First words in each language — used in onboarding
export const FIRST_WORDS: Record<string, string> = {
  en: "Hello!",
  es: "¡Hola!",
  no: "Hei!",
  fr: "Bonjour!",
  de: "Hallo!",
  it: "Ciao!",
  sv: "Hej!",
  pt: "Olá!",
  hu: "Helló!",
  fi: "Hei!",
  ko: "안녕!",
  ja: "こんにちは!",
  zh: "你好!",
  ru: "Привет!",
  default: "Hello!",
};

export function getFirstWord(langCode: string): string {
  return FIRST_WORDS[langCode] ?? FIRST_WORDS.default;
}

// Duration limits per age group (minutes)
export const KIDS_LESSON_DURATION: Record<string, number> = {
  "4-6": 5,
  "7-9": 10,
  "10-12": 15,
};

// Avatar options per theme — used in onboarding avatar selection
export const KIDS_AVATARS: Record<string, string[]> = {
  castle: ["🧙‍♀️", "👸", "🦄", "🧚", "🐉", "⭐", "🌈", "🏰"],
  jungle: ["🦕", "🐊", "🦁", "🐘", "🦒", "🐆", "🦜", "🌿"],
  space: ["🚀", "🤖", "👨‍🚀", "🛸", "👾", "🌟", "🪐", "🔭"],
};

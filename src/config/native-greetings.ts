// First-line greeting in the user's NATIVE language (chosen during onboarding).
// Used as the opening of the welcome email: "Cześć Maciej!" / "Hei Tomasz!" etc.
export const NATIVE_GREETINGS: Record<string, string> = {
  pl: "Cześć",
  en: "Hello",
  ar: "مرحبا",
  bg: "Здравей",
  cs: "Ahoj",
  da: "Hej",
  de: "Hallo",
  el: "Γεια σου",
  es: "¡Hola",
  fi: "Hei",
  fr: "Salut",
  hi: "नमस्ते",
  hr: "Bok",
  hu: "Szia",
  id: "Halo",
  it: "Ciao",
  ja: "こんにちは",
  ko: "안녕하세요",
  lt: "Labas",
  nl: "Hallo",
  no: "Hei",
  pt: "Olá",
  ro: "Salut",
  ru: "Привет",
  sk: "Ahoj",
  sl: "Živjo",
  sv: "Hej",
  th: "สวัสดี",
  tr: "Merhaba",
  uk: "Привіт",
  vi: "Xin chào",
  zh: "你好",
};

export function nativeGreeting(nativeLang: string | null | undefined, name: string): string {
  const g = NATIVE_GREETINGS[nativeLang ?? ""] ?? "Hello";
  // Spanish opening ¡Hola needs the closing form too
  if (nativeLang === "es") return `¡Hola ${name}!`;
  return `${g} ${name}!`;
}

export const LANG_FLAGS: Record<string, string> = {
  no: "\uD83C\uDDF3\uD83C\uDDF4",
  fr: "\uD83C\uDDEB\uD83C\uDDF7",
  es: "\uD83C\uDDEA\uD83C\uDDF8",
  en: "\uD83C\uDDEC\uD83C\uDDE7",
  it: "\uD83C\uDDEE\uD83C\uDDF9",
  sv: "\uD83C\uDDF8\uD83C\uDDEA",
  de: "\uD83C\uDDE9\uD83C\uDDEA",
  fi: "\uD83C\uDDEB\uD83C\uDDEE",
  ko: "\uD83C\uDDF0\uD83C\uDDF7",
  ja: "\uD83C\uDDEF\uD83C\uDDF5",
};

export const LANG_NAMES: Record<string, Record<string, string>> = {
  no: { pl: "Norweski", en: "Norwegian" },
  fr: { pl: "Francuski", en: "French" },
  es: { pl: "Hiszpański", en: "Spanish" },
  en: { pl: "Angielski", en: "English" },
  it: { pl: "Włoski", en: "Italian" },
  sv: { pl: "Szwedzki", en: "Swedish" },
  de: { pl: "Niemiecki", en: "German" },
  fi: { pl: "Fiński", en: "Finnish" },
  ko: { pl: "Koreański", en: "Korean" },
  ja: { pl: "Japoński", en: "Japanese" },
};

export const VARIANT_FLAGS: Record<string, string> = {
  "en-US": "\uD83C\uDDFA\uD83C\uDDF8",
  "en-GB": "\uD83C\uDDEC\uD83C\uDDE7",
  "es-EU": "\uD83C\uDDEA\uD83C\uDDF8",
  "es-LATAM": "\uD83C\uDDF2\uD83C\uDDFD",
  american: "\uD83C\uDDFA\uD83C\uDDF8",
  british: "\uD83C\uDDEC\uD83C\uDDE7",
  european: "\uD83C\uDDEA\uD83C\uDDF8",
  bokmal: "\uD83C\uDDF3\uD83C\uDDF4",
};

export function getLangFlag(lang: string, variant?: string | null): string {
  if (variant && VARIANT_FLAGS[variant]) return VARIANT_FLAGS[variant];
  return LANG_FLAGS[lang] ?? "";
}

export function getLangName(lang: string, locale?: string): string {
  const names = LANG_NAMES[lang];
  if (!names) return lang;
  return names[locale ?? "pl"] ?? names.pl ?? lang;
}

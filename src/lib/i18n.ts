"use client";

import { createContext, useContext } from "react";
import { translations } from "./i18n-data";

// Re-export everything from i18n-data for client components
export type { Locale } from "./i18n-data";
export { getTranslations, resolveLocale, detectBrowserLocale } from "./i18n-data";

// React context + hook (client-only)
export const LocaleContext = createContext<"pl" | "en">("en");

export function useTranslation() {
  const locale = useContext(LocaleContext);
  const t = (key: string): string => {
    return translations[locale]?.[key] ?? translations.en[key] ?? key;
  };
  return { t, locale };
}

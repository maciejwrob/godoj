"use client";

import { useState, useEffect } from "react";
import { LocaleContext, SetLocaleContext } from "@/lib/i18n";
import { resolveLocale } from "@/lib/i18n-data";
import type { Locale } from "@/lib/i18n-data";
import type { ReactNode } from "react";

export function LocaleWrapper({ nativeLanguage, children }: { nativeLanguage: string; children: ReactNode }) {
  const serverLocale = resolveLocale(nativeLanguage);
  const [locale, setLocale] = useState<Locale>(serverLocale);

  // On mount, check if localStorage has a preferred locale (from the toggle)
  useEffect(() => {
    const stored = localStorage.getItem("godoj_ui_locale");
    if (stored === "pl" || stored === "en") {
      setLocale(stored);
    }
  }, []);

  return (
    <SetLocaleContext.Provider value={setLocale}>
      <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
    </SetLocaleContext.Provider>
  );
}

"use client";

import { useState, useEffect } from "react";
import { LocaleContext } from "@/lib/i18n";
import { resolveLocale } from "@/lib/i18n-data";
import type { ReactNode } from "react";

export function LocaleWrapper({ nativeLanguage, children }: { nativeLanguage: string; children: ReactNode }) {
  const serverLocale = resolveLocale(nativeLanguage);
  const [locale, setLocale] = useState(serverLocale);

  // On mount, check if localStorage has a preferred locale (from the toggle)
  useEffect(() => {
    const stored = localStorage.getItem("godoj_ui_locale");
    if (stored === "pl" || stored === "en") {
      setLocale(stored);
    }
  }, []);

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

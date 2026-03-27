"use client";

import { LocaleContext, resolveLocale } from "@/lib/i18n";
import type { ReactNode } from "react";

export function LocaleWrapper({ nativeLanguage, children }: { nativeLanguage: string; children: ReactNode }) {
  const locale = resolveLocale(nativeLanguage);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

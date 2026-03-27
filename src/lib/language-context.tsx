"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getLangFlag, getLangName } from "./languages";

export type LangProfile = {
  id: string;
  target_language: string;
  language_variant: string | null;
  current_level: string;
  selected_agent_id: string | null;
};

type LanguageCtx = {
  ready: boolean;
  profiles: LangProfile[];
  active: LangProfile | null;
  language: string;
  languageName: string;
  flag: string;
  level: string;
  agentId: string;
  variant: string | null;
  switchLanguage: (lang: string) => void;
};

const LanguageContext = createContext<LanguageCtx>({
  ready: false,
  profiles: [],
  active: null,
  language: "",
  languageName: "",
  flag: "",
  level: "A1",
  agentId: "",
  variant: null,
  switchLanguage: () => {},
});

const STORAGE_KEY = "godoj_active_lang";

export function LanguageProvider({
  serverProfiles,
  defaultLanguage,
  children,
}: {
  serverProfiles: LangProfile[];
  defaultLanguage: string;
  children: ReactNode;
}) {
  const [activeLang, setActiveLang] = useState(defaultLanguage);
  const [ready, setReady] = useState(false);

  // On mount: check localStorage for saved language
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && serverProfiles.some((p) => p.target_language === stored)) {
      setActiveLang(stored);
    }
    setReady(true);
  }, [serverProfiles]);

  const activeProfile = serverProfiles.find((p) => p.target_language === activeLang) ?? serverProfiles[0] ?? null;

  const switchLanguage = useCallback((lang: string) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setActiveLang(lang);
    // Full reload to clear all stale data from server components
    window.location.reload();
  }, []);

  const fallbackLang = serverProfiles[0]?.target_language ?? "";
  const value: LanguageCtx = {
    ready,
    profiles: serverProfiles,
    active: activeProfile,
    language: activeProfile?.target_language ?? fallbackLang,
    languageName: getLangName(activeProfile?.target_language ?? fallbackLang),
    flag: getLangFlag(activeProfile?.target_language ?? fallbackLang, activeProfile?.language_variant),
    level: activeProfile?.current_level ?? "A1",
    agentId: activeProfile?.selected_agent_id ?? "",
    variant: activeProfile?.language_variant ?? null,
    switchLanguage,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// Keep backward compat
export function useActiveLanguage() {
  const ctx = useLanguage();
  return {
    activeLanguage: ctx.language,
    setActiveLanguage: ctx.switchLanguage,
  };
}

"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type LanguageCtx = {
  activeLanguage: string;
  setActiveLanguage: (lang: string) => void;
};

const LanguageContext = createContext<LanguageCtx>({
  activeLanguage: "",
  setActiveLanguage: () => {},
});

export function LanguageProvider({ defaultLanguage, children }: { defaultLanguage: string; children: ReactNode }) {
  const [activeLanguage, setActive] = useState(defaultLanguage);

  useEffect(() => {
    const stored = localStorage.getItem("godoj_active_lang");
    if (stored) setActive(stored);
  }, []);

  const setActiveLanguage = (lang: string) => {
    setActive(lang);
    localStorage.setItem("godoj_active_lang", lang);
  };

  return (
    <LanguageContext.Provider value={{ activeLanguage, setActiveLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useActiveLanguage() {
  return useContext(LanguageContext);
}

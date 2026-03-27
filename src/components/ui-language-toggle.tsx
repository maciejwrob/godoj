"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "godoj_ui_locale";

export function getStoredUILocale(): "pl" | "en" {
  if (typeof localStorage === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "pl" || stored === "en") return stored;
  // Auto-detect from browser
  if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("pl")) return "pl";
  return "en";
}

export function UILanguageToggle({ className }: { className?: string }) {
  const [locale, setLocale] = useState<"pl" | "en">("en");

  useEffect(() => {
    setLocale(getStoredUILocale());
  }, []);

  const toggle = () => {
    const next = locale === "pl" ? "en" : "pl";
    localStorage.setItem(STORAGE_KEY, next);
    setLocale(next);
    window.location.reload();
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white ${className ?? ""}`}
      title={locale === "pl" ? "Switch to English" : "Zmień na polski"}
    >
      <span className="text-sm">{locale === "pl" ? "🇵🇱" : "🇬🇧"}</span>
      <span>{locale === "pl" ? "PL" : "EN"}</span>
    </button>
  );
}

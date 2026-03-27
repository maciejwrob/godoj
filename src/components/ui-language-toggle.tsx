"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";

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
      <Globe className="h-3.5 w-3.5" />
      <span>{locale === "pl" ? "Polski" : "English"}</span>
      <span className="text-[10px] text-slate-500">&#9662;</span>
    </button>
  );
}

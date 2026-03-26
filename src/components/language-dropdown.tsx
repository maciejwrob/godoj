"use client";

import { useState, useEffect, useRef } from "react";
import { useActiveLanguage } from "@/lib/language-context";
import { getLangFlag, getLangName } from "@/lib/languages";
import { AddLanguageModal } from "./add-language-modal";

type LangProfile = { target_language: string; language_variant: string | null; current_level: string };

export function LanguageDropdown({ languages }: { languages: LangProfile[] }) {
  const { activeLanguage, setActiveLanguage } = useActiveLanguage();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = languages.find((l) => l.target_language === activeLanguage) ?? languages[0];

  const handleSelect = (lang: string) => {
    setActiveLanguage(lang);
    setOpen(false);
    window.location.reload(); // Force reload to update all server-fetched data
  };

  return (
    <>
      <div ref={ref} className="relative">
        <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-left hover:bg-white/5 transition-colors">
          <span className="text-lg">{getLangFlag(current?.target_language ?? "")}</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-white truncate block">{getLangName(current?.target_language ?? "")}</span>
            <span className="text-[10px] text-slate-500">Poziom {current?.current_level ?? "A1"}</span>
          </div>
          <span className="material-symbols-outlined text-sm text-slate-500">{open ? "expand_less" : "expand_more"}</span>
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-white/5 bg-surface-container-high p-1 shadow-2xl">
            {languages.map((l) => (
              <button key={l.target_language} onClick={() => handleSelect(l.target_language)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  l.target_language === activeLanguage ? "bg-godoj-blue/10 text-godoj-blue" : "text-slate-300 hover:bg-white/5"
                }`}>
                <span>{getLangFlag(l.target_language, l.language_variant)}</span>
                <span className="font-medium">{getLangName(l.target_language)}</span>
                <span className="ml-auto text-[10px] text-slate-500">{l.current_level}</span>
              </button>
            ))}
            <div className="mt-1 border-t border-white/5 pt-1">
              <button onClick={() => { setOpen(false); setModalOpen(true); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-primary/5">
                <span className="material-symbols-outlined text-sm">add</span>
                Dodaj jezyk
              </button>
            </div>
          </div>
        )}
      </div>
      <AddLanguageModal open={modalOpen} onClose={() => setModalOpen(false)} existingLangs={languages.map((l) => l.target_language)} />
    </>
  );
}

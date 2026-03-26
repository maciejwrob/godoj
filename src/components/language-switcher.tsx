"use client";

import { useState } from "react";
import { useActiveLanguage } from "@/lib/language-context";
import { getLangFlag, getLangName } from "@/lib/languages";
import { AddLanguageModal } from "./add-language-modal";

type LangProfile = { target_language: string; language_variant: string | null; current_level: string };

export function LanguageSwitcher({ languages }: { languages: LangProfile[] }) {
  const { activeLanguage, setActiveLanguage } = useActiveLanguage();
  const [modalOpen, setModalOpen] = useState(false);

  if (languages.length <= 1 && !modalOpen) {
    return (
      <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-full border border-white/5 bg-surface-container-high px-4 py-2 text-sm hover:border-primary/50 transition-all">
        <span className="material-symbols-outlined text-sm text-primary">add</span>
        <span className="text-on-surface-variant">Dodaj język</span>
        <AddLanguageModal open={modalOpen} onClose={() => setModalOpen(false)} existingLangs={languages.map((l) => l.target_language)} />
      </button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1 rounded-2xl border border-white/5 bg-surface-container p-1">
        {languages.map((l) => (
          <button
            key={l.target_language}
            onClick={() => setActiveLanguage(l.target_language)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all ${
              activeLanguage === l.target_language ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:text-white"
            }`}
          >
            <span>{getLangFlag(l.target_language, l.language_variant)}</span>
            <span className="hidden sm:inline">{getLangName(l.target_language)}</span>
          </button>
        ))}
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-on-surface-variant hover:text-primary transition-all">
          <span className="material-symbols-outlined text-sm">add</span>
        </button>
      </div>
      <AddLanguageModal open={modalOpen} onClose={() => setModalOpen(false)} existingLangs={languages.map((l) => l.target_language)} />
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Loader2, X, Lock } from "lucide-react";
import { getLangFlag, getLangName } from "@/lib/languages";
import { useTranslation } from "@/lib/i18n";

const LANGUAGES = [
  { id: "no", active: true, variants: null },
  { id: "fr", active: true, variants: null },
  { id: "es", active: true, variants: null },
  { id: "en", active: true, variants: [{ id: "american", name: { pl: "Amerykański", en: "American" } }, { id: "british", name: { pl: "Brytyjski", en: "British" } }] },
  { id: "it", active: true, variants: null },
  { id: "sv", active: true, variants: null },
  { id: "de", active: true, variants: null },
  { id: "fi", active: true, variants: null },
  { id: "ko", active: true, variants: null },
  { id: "ja", active: true, variants: null },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function AddLanguageModal({ open, onClose, existingLangs }: { open: boolean; onClose: () => void; existingLangs: string[] }) {
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState("");
  const [variant, setVariant] = useState<string | null>(null);
  const [level, setLevel] = useState("A1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sub, setSub] = useState<{ tier?: string; isUnlimited?: boolean } | null>(null);
  const { t, locale } = useTranslation();

  // Fetch subscription tier when modal opens (for language-count limit)
  useEffect(() => {
    if (!open) return;
    fetch("/api/subscription").then((r) => r.json()).then(setSub).catch(() => setSub({}));
  }, [open]);

  const tierBase = (sub?.tier ?? "free").replace("_yearly", "");
  const maxLangs = sub?.isUnlimited ? 99 : tierBase === "pro" ? 2 : 1;
  const atLimit = sub !== null && existingLangs.length >= maxLangs;

  const selectedLang = LANGUAGES.find((l) => l.id === lang);
  const availableLangs = LANGUAGES.filter((l) => !existingLangs.includes(l.id));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/add-language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_language: lang, language_variant: variant, current_level: level, selected_agent_id: null, ui_locale: locale }),
      });
      if (res.ok) {
        onClose();
        // Set the new language as active so dashboard loads with it
        localStorage.setItem("godoj_active_lang", lang);
        document.cookie = `godoj_active_lang=${lang}; path=/; max-age=31536000; samesite=lax`;
        window.location.href = "/app/dashboard";
      } else {
        const data = await res.json();
        setError(data.error ?? t("error"));
      }
    } catch { setError(t("error")); }
    setSaving(false);
  };

  if (!open) return null;

  // Plan limit reached → upgrade prompt instead of language list
  if (atLimit) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-3xl border border-white/5 bg-surface-container p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-extrabold text-white">{t("addLanguage")}</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          <div className="text-center space-y-4 py-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {tierBase === "pro"
                ? (locale === "pl" ? "Plan Pro obejmuje maksymalnie 2 języki." : "The Pro plan includes up to 2 languages.")
                : (locale === "pl"
                    ? "Twój plan obejmuje naukę 1 języka. Przejdź na Pro, aby uczyć się 2 języków jednocześnie."
                    : "Your plan includes 1 language. Upgrade to Pro to learn 2 languages at once.")}
            </p>
            {tierBase !== "pro" && (
              <a href="/app/settings/plans" className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-all">
                {locale === "pl" ? "Zobacz plan Pro" : "See the Pro plan"}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/5 bg-surface-container p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-extrabold text-white">{t("addLanguage")}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {/* Step 1: Choose language */}
        {step === 1 && (
          <div>
            <p className="mb-4 text-sm text-on-surface-variant">{t("targetLangHint")}</p>
            <div className="grid grid-cols-2 gap-2">
              {availableLangs.map((l) => (
                <button key={l.id} onClick={() => { setLang(l.id); setVariant(null); setStep(l.variants ? 2 : 3); }}
                  className="flex items-center gap-2 rounded-xl border border-white/5 bg-surface-container-high p-3 text-left hover:border-primary/50 transition-all">
                  <span className="text-xl">{getLangFlag(l.id)}</span>
                  <span className="text-sm font-medium">{getLangName(l.id, locale)}</span>
                </button>
              ))}
            </div>
            {availableLangs.length === 0 && <p className="text-center text-on-surface-variant py-4">{t("allLanguagesLearned")}</p>}
          </div>
        )}

        {/* Step 2: Variant */}
        {step === 2 && selectedLang?.variants && (
          <div>
            <p className="mb-4 text-sm text-on-surface-variant">{t("chooseVariant")}</p>
            <div className="space-y-2">
              {selectedLang.variants.map((v) => (
                <button key={v.id} onClick={() => { setVariant(v.id); setStep(3); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-surface-container-high p-4 text-left hover:border-primary/50">
                  <span className="font-medium">{v.name[locale] ?? v.name.pl}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Level */}
        {step === 3 && (
          <div>
            <p className="mb-4 text-sm text-on-surface-variant">{getLangFlag(lang)} {getLangName(lang, locale)} — {t("levelQuestion")}</p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button key={l} onClick={() => setLevel(l)}
                  className={`rounded-xl border px-5 py-3 text-sm font-bold transition-all ${level === l ? "border-primary bg-primary/10 text-primary" : "border-white/5 bg-surface-container-high hover:border-primary/50"}`}>
                  {l}
                </button>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button onClick={handleSave} disabled={saving}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("addLanguage")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

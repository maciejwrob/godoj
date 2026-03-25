"use client";

import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { getLangFlag, getLangName } from "@/lib/languages";

const LANGUAGES = [
  { id: "no", active: true, variants: null },
  { id: "fr", active: true, variants: null },
  { id: "es", active: true, variants: [{ id: "european", name: "Europejski" }, { id: "es-LATAM", name: "Latynoamerykanski" }] },
  { id: "en", active: true, variants: [{ id: "american", name: "Amerykanski" }, { id: "british", name: "Brytyjski" }] },
  { id: "it", active: true, variants: null },
  { id: "sv", active: true, variants: null },
  { id: "de", active: true, variants: null },
  { id: "fi", active: true, variants: null },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

type Agent = { id: string; voice_name: string; voice_description: string | null; language: string };

export function AddLanguageModal({ open, onClose, existingLangs }: { open: boolean; onClose: () => void; existingLangs: string[] }) {
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState("");
  const [variant, setVariant] = useState<string | null>(null);
  const [level, setLevel] = useState("A1");
  const [agentId, setAgentId] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedLang = LANGUAGES.find((l) => l.id === lang);
  const availableLangs = LANGUAGES.filter((l) => !existingLangs.includes(l.id));

  // Fetch agents when language is selected
  useEffect(() => {
    if (!lang) return;
    fetch(`/api/admin/agents`).then((r) => r.json()).then((data) => {
      const filtered = (data ?? []).filter((a: Agent) => a.language === lang);
      setAgents(filtered);
      if (filtered.length > 0) setAgentId(filtered[0].id);
    }).catch(() => {});
  }, [lang]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/add-language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_language: lang, language_variant: variant, current_level: level, selected_agent_id: agentId }),
      });
      if (res.ok) {
        onClose();
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error ?? "Blad");
      }
    } catch { setError("Blad polaczenia"); }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/5 bg-surface-container p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-extrabold text-white">Dodaj jezyk</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {/* Step 1: Choose language */}
        {step === 1 && (
          <div>
            <p className="mb-4 text-sm text-on-surface-variant">Wybierz jezyk do nauki</p>
            <div className="grid grid-cols-2 gap-2">
              {availableLangs.map((l) => (
                <button key={l.id} onClick={() => { setLang(l.id); setVariant(null); setStep(l.variants ? 2 : 3); }}
                  className="flex items-center gap-2 rounded-xl border border-white/5 bg-surface-container-high p-3 text-left hover:border-primary/50 transition-all">
                  <span className="text-xl">{getLangFlag(l.id)}</span>
                  <span className="text-sm font-medium">{getLangName(l.id)}</span>
                </button>
              ))}
            </div>
            {availableLangs.length === 0 && <p className="text-center text-on-surface-variant py-4">Uczysz sie juz wszystkich dostepnych jezykow!</p>}
          </div>
        )}

        {/* Step 2: Variant */}
        {step === 2 && selectedLang?.variants && (
          <div>
            <p className="mb-4 text-sm text-on-surface-variant">Wybierz wariant</p>
            <div className="space-y-2">
              {selectedLang.variants.map((v) => (
                <button key={v.id} onClick={() => { setVariant(v.id); setStep(3); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-surface-container-high p-4 text-left hover:border-primary/50">
                  <span className="font-medium">{v.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Level */}
        {step === 3 && (
          <div>
            <p className="mb-4 text-sm text-on-surface-variant">{getLangFlag(lang)} {getLangName(lang)} — Twoj poziom?</p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button key={l} onClick={() => setLevel(l)}
                  className={`rounded-xl border px-5 py-3 text-sm font-bold transition-all ${level === l ? "border-primary bg-primary/10 text-primary" : "border-white/5 bg-surface-container-high hover:border-primary/50"}`}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(4)} className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/90">Dalej</button>
          </div>
        )}

        {/* Step 4: Tutor */}
        {step === 4 && (
          <div>
            <p className="mb-4 text-sm text-on-surface-variant">Wybierz tutora</p>
            {agents.length === 0 ? (
              <p className="text-center text-on-surface-variant py-4">Brak tutorow dla tego jezyka</p>
            ) : (
              <div className="space-y-2">
                {agents.map((a) => (
                  <button key={a.id} onClick={() => setAgentId(a.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${agentId === a.id ? "border-primary bg-primary/10" : "border-white/5 bg-surface-container-high hover:border-primary/50"}`}>
                    <div>
                      <div className="font-bold text-white">{a.voice_name}</div>
                      {a.voice_description && <div className="text-xs text-on-surface-variant">{a.voice_description}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button onClick={handleSave} disabled={saving || !agentId}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Dodaj jezyk
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

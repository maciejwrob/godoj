"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Baby, Plus, Pencil, Trash2, Loader2, Check, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { WORLD_LANGUAGES } from "@/config/world-languages";
import { THEME_CONFIG, getAgeGroup, calculateAge, setActiveChild } from "@/lib/kids";
import type { ChildProfileWithMeta, KidsTheme } from "@/types/kids";

// --- helpers ---

function formatLastActivity(lastActivityAt: string | null): string {
  if (!lastActivityAt) return "Nigdy";
  const now = new Date();
  const last = new Date(lastActivityAt);
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Dzisiaj";
  if (diffDays === 1) return "Wczoraj";
  if (diffDays < 7) return `${diffDays} dni temu`;
  return last.toLocaleDateString("pl-PL");
}

function getFlag(langCode: string): string {
  return WORLD_LANGUAGES.find((l) => l.code === langCode)?.flag ?? "🌍";
}

function AvatarCircle({ name, theme, size = 40 }: { name: string; theme: KidsTheme; size?: number }) {
  const cfg = THEME_CONFIG[theme];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: cfg.primary,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Max date: 3 years ago; Min date: 13 years ago
function getDobLimits(): { min: string; max: string } {
  const today = new Date();
  const max = new Date(today);
  max.setFullYear(max.getFullYear() - 3);
  const min = new Date(today);
  min.setFullYear(min.getFullYear() - 13);
  return {
    min: min.toISOString().split("T")[0],
    max: max.toISOString().split("T")[0],
  };
}

// --- sub-components ---

function AnimatedDots() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(id);
  }, []);
  return <span>{dots}</span>;
}

function TransitionScreen({ child }: { child: ChildProfileWithMeta }) {
  const cfg = THEME_CONFIG[child.theme];
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ backgroundColor: cfg.bg }}
    >
      <div className="text-center">
        <div
          className="mb-6 text-8xl"
          style={{
            animation: "pulse 1s ease-in-out infinite",
          }}
        >
          {cfg.heroEmoji}
        </div>
        <p
          className="text-2xl font-bold"
          style={{ color: cfg.primary }}
        >
          Przygotowuję świat {child.name}
          <AnimatedDots />
        </p>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
      `}</style>
    </div>
  );
}

interface AddFormState {
  name: string;
  dob: string;
  language: string;
  theme: KidsTheme;
  pin: string;
  pinConfirm: string;
}

const EMPTY_ADD_FORM: AddFormState = {
  name: "",
  dob: "",
  language: "",
  theme: "jungle",
  pin: "",
  pinConfirm: "",
};

function AddChildModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (child: ChildProfileWithMeta) => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AddFormState>(EMPTY_ADD_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { min, max } = getDobLimits();

  const ageGroup = form.dob ? getAgeGroup(form.dob) : null;
  const age = form.dob ? calculateAge(form.dob) : null;

  function validateStep(): string {
    if (step === 1) {
      if (!form.name.trim()) return "Wpisz imię dziecka";
      if (!form.dob) return "Wybierz datę urodzenia";
      if (age !== null && (age < 3 || age > 13)) return "Wiek musi być między 3 a 13 lat";
    }
    if (step === 2) {
      if (!form.language) return "Wybierz język";
    }
    if (step === 4) {
      if (!/^\d{4}$/.test(form.pin)) return "PIN musi mieć dokładnie 4 cyfry";
      if (form.pin !== form.pinConfirm) return "PINy nie są zgodne";
    }
    return "";
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  }

  function back() {
    setError("");
    setStep((s) => s - 1);
  }

  async function save() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/kids/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          date_of_birth: form.dob,
          theme: form.theme,
          target_language: form.language,
          pin: form.pin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd zapisu");
      onCreated(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-text-primary">
            {step === 1 && "Dane dziecka"}
            {step === 2 && "Język do nauki"}
            {step === 3 && "Motyw wizualny"}
            {step === 4 && "PIN rodzica"}
          </h2>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="h-2 w-2 rounded-full transition-colors"
                style={{ backgroundColor: s === step ? "#3b82f6" : s < step ? "#22c55e" : "#374151" }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">Imię dziecka</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="np. Zosia"
                  className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-text-primary outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">Data urodzenia</label>
                <input
                  type="date"
                  value={form.dob}
                  min={min}
                  max={max}
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-text-primary outline-none focus:border-primary"
                />
                {ageGroup && (
                  <p className="mt-1.5 text-sm text-text-secondary">
                    Grupa wiekowa:{" "}
                    <span className="font-semibold text-text-primary">{ageGroup} lat</span>
                    {age !== null && ` · ${age} lat`}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="mb-3 text-sm text-text-secondary">Wybierz język, którego dziecko będzie się uczyć</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {WORLD_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setForm((f) => ({ ...f, language: lang.code }))}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-colors ${
                      form.language === lang.code
                        ? "border-primary bg-primary/10"
                        : "border-border bg-bg-dark hover:border-primary/40"
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-center text-[11px] font-medium leading-tight text-text-primary">
                      {lang.nameNative}
                    </span>
                    {form.language === lang.code && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">Wybierz świat, w którym dziecko będzie się uczyć</p>
              {(["castle", "jungle", "space"] as KidsTheme[]).map((t) => {
                const cfg = THEME_CONFIG[t];
                return (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, theme: t }))}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors ${
                      form.theme === t ? "border-primary" : "border-border hover:border-primary/40"
                    }`}
                    style={{
                      background: form.theme === t
                        ? `${cfg.bg}`
                        : undefined,
                    }}
                  >
                    <div
                      className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-3xl"
                      style={{ background: cfg.heroBg }}
                    >
                      {cfg.heroEmoji}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-text-primary">{cfg.label}</p>
                      <p className="text-sm text-text-secondary">{cfg.description}</p>
                    </div>
                    {form.theme === t && (
                      <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="text-sm text-yellow-300">
                  Ten PIN będzie potrzebny, żeby wrócić na Twoje konto dorosłego. Zapamiętaj go!
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">4-cyfrowy PIN</label>
                <input
                  type="tel"
                  maxLength={4}
                  value={form.pin}
                  onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  placeholder="••••"
                  className="w-full rounded-lg border border-border bg-bg-dark px-3 py-3 text-center text-2xl font-bold tracking-widest text-text-primary outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">Powtórz PIN</label>
                <input
                  type="tel"
                  maxLength={4}
                  value={form.pinConfirm}
                  onChange={(e) => setForm((f) => ({ ...f, pinConfirm: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  placeholder="••••"
                  className="w-full rounded-lg border border-border bg-bg-dark px-3 py-3 text-center text-2xl font-bold tracking-widest text-text-primary outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            onClick={step === 1 ? onClose : back}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? "Anuluj" : "Wstecz"}
          </button>

          {step < 4 ? (
            <button
              onClick={next}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Dalej
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Tworzę..." : "Utwórz konto"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditChildModal({
  child,
  onClose,
  onUpdated,
  onDeleted,
}: {
  child: ChildProfileWithMeta;
  onClose: () => void;
  onUpdated: (child: ChildProfileWithMeta) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(child.name);
  const [theme, setTheme] = useState<KidsTheme>(child.theme);
  const [language, setLanguage] = useState(child.target_language);
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(child.daily_time_limit_min !== null);
  const [timeLimit, setTimeLimit] = useState(child.daily_time_limit_min ?? 60);
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!name.trim()) { setError("Imię jest wymagane"); return; }
    if (newPin) {
      if (!/^\d{4}$/.test(newPin)) { setError("PIN musi mieć 4 cyfry"); return; }
      if (newPin !== newPinConfirm) { setError("PINy nie są zgodne"); return; }
    }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        name,
        theme,
        target_language: language,
        daily_time_limit_min: timeLimitEnabled ? timeLimit : null,
      };
      if (newPin) body.pin = newPin;

      const res = await fetch(`/api/kids/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd zapisu");
      onUpdated({
        ...data,
        age: calculateAge(data.date_of_birth),
        age_group: getAgeGroup(data.date_of_birth),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/kids/children/${child.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Błąd usuwania");
      }
      onDeleted(child.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd usuwania");
      setDeleting(false);
    }
  }

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-6 shadow-2xl">
          <h2 className="mb-2 text-lg font-bold text-text-primary">Usunąć konto {child.name}?</h2>
          <p className="mb-6 text-sm text-text-secondary">
            To usunie wszystkie postępy, słownictwo i historię lekcji {child.name}. Tej operacji nie można cofnąć.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary"
            >
              Anuluj
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {deleting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Tak, usuń"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-text-primary">Edytuj konto {child.name}</h2>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Imię</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-text-primary outline-none focus:border-primary"
            />
          </div>

          {/* Language */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text-secondary">Język</label>
            <div className="grid grid-cols-4 gap-2">
              {WORLD_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border-2 p-2 transition-colors ${
                    language === lang.code ? "border-primary bg-primary/10" : "border-border bg-bg-dark"
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-[10px] text-text-primary">{lang.nameNative}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text-secondary">Motyw</label>
            <div className="grid grid-cols-3 gap-2">
              {(["castle", "jungle", "space"] as KidsTheme[]).map((t) => {
                const cfg = THEME_CONFIG[t];
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-colors ${
                      theme === t ? "border-primary" : "border-border"
                    }`}
                  >
                    <span className="text-2xl">{cfg.heroEmoji}</span>
                    <span className="text-center text-[11px] font-medium text-text-primary">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time limit */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">Dzienny limit czasu</label>
              <button
                onClick={() => setTimeLimitEnabled((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${timeLimitEnabled ? "bg-primary" : "bg-bg-card-hover"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${timeLimitEnabled ? "translate-x-5.5" : "translate-x-0.5"}`}
                />
              </button>
            </div>
            {timeLimitEnabled && (
              <div>
                <label className="mb-1 block text-sm text-text-secondary">{timeLimit} minut / dzień</label>
                <input
                  type="range"
                  min={15}
                  max={120}
                  step={5}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="mt-0.5 flex justify-between text-xs text-text-secondary">
                  <span>15 min</span>
                  <span>120 min</span>
                </div>
              </div>
            )}
          </div>

          {/* Change PIN */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text-secondary">Zmień PIN (opcjonalnie)</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="tel"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Nowy PIN"
                className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-center text-lg font-bold tracking-widest text-text-primary outline-none focus:border-primary"
              />
              <input
                type="tel"
                maxLength={4}
                value={newPinConfirm}
                onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Powtórz PIN"
                className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-center text-lg font-bold tracking-widest text-text-primary outline-none focus:border-primary"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Delete */}
          <div className="border-t border-border pt-4">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-sm font-medium text-red-400 transition-colors hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
              Usuń konto {child.name}
            </button>
          </div>
        </div>

        <div className="flex gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Zapisz zmiany"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessToast({ childName, onSwitch, onDismiss }: { childName: string; onSwitch: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[150] w-full max-w-sm -translate-x-1/2 px-4">
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 shadow-lg">
        <p className="mb-3 text-sm font-medium text-green-400">
          Konto {childName} zostało utworzone! 🎉
        </p>
        <div className="flex gap-2">
          <button
            onClick={onSwitch}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-500 py-2 text-sm font-medium text-white"
          >
            Przełącz na konto <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDismiss}
            className="rounded-lg border border-green-500/30 px-3 py-2 text-sm text-green-400"
          >
            Zostań
          </button>
        </div>
      </div>
    </div>
  );
}

// --- main component ---

export function ChildrenSection() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildProfileWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildProfileWithMeta | null>(null);
  const [switchingChild, setSwitchingChild] = useState<ChildProfileWithMeta | null>(null);
  const [successChild, setSuccessChild] = useState<ChildProfileWithMeta | null>(null);

  const fetchChildren = useCallback(async () => {
    try {
      const res = await fetch("/api/kids/children");
      if (res.ok) {
        const data = await res.json();
        setChildren(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  function handleSwitch(child: ChildProfileWithMeta) {
    setSwitchingChild(child);
    setTimeout(() => {
      setActiveChild(child.id);
      router.push("/kids/dashboard");
    }, 2200);
  }

  function handleCreated(child: ChildProfileWithMeta) {
    setChildren((prev) => [...prev, child]);
    setShowAdd(false);
    setSuccessChild(child);
  }

  function handleUpdated(updated: ChildProfileWithMeta) {
    setChildren((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setEditingChild(null);
  }

  function handleDeleted(id: string) {
    setChildren((prev) => prev.filter((c) => c.id !== id));
    setEditingChild(null);
  }

  return (
    <>
      <section className="mb-6 rounded-2xl border border-border bg-bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Baby className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Konta dzieci</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : children.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Dodaj konto dziecka, żeby Twoje dziecko mogło uczyć się języków w bezpiecznym, kolorowym środowisku!
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Dodaj dziecko
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {children.map((child) => {
              const cfg = THEME_CONFIG[child.theme];
              const flag = getFlag(child.target_language);
              return (
                <div
                  key={child.id}
                  className="rounded-xl border border-border bg-bg-dark p-4"
                >
                  <div className="flex items-start gap-3">
                    <AvatarCircle name={child.name} theme={child.theme} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary">{child.name}</span>
                        <span className="text-sm text-text-secondary">{child.age} lat</span>
                        <span className="text-lg">{flag}</span>
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cfg.dotColor }}
                          title={cfg.label}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {formatLastActivity(child.last_activity_at)} · ⭐ {child.stars_total} gwiazdek · 🔥 {child.current_streak} dni serii
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSwitch(child)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      Przełącz na konto
                    </button>
                    <button
                      onClick={() => setEditingChild(child)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edytuj
                    </button>
                  </div>
                </div>
              );
            })}

            {children.length < 5 ? (
              <button
                onClick={() => setShowAdd(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-text-primary"
              >
                <Plus className="h-4 w-4" />
                Dodaj kolejne dziecko
              </button>
            ) : (
              <p className="text-center text-xs text-text-secondary">
                Osiągnięto limit 5 kont dziecięcych
              </p>
            )}
          </div>
        )}
      </section>

      {showAdd && (
        <AddChildModal
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}

      {editingChild && (
        <EditChildModal
          child={editingChild}
          onClose={() => setEditingChild(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {switchingChild && <TransitionScreen child={switchingChild} />}

      {successChild && (
        <SuccessToast
          childName={successChild.name}
          onSwitch={() => {
            setSuccessChild(null);
            handleSwitch(successChild);
          }}
          onDismiss={() => setSuccessChild(null)}
        />
      )}
    </>
  );
}

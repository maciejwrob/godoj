"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, BookOpen, LogOut, Save, Loader2, CreditCard } from "lucide-react";
import Link from "next/link";
import { ChildrenSection } from "@/components/kids/children-section";
import { clearActiveChild } from "@/lib/kids";
import { useTranslation } from "@/lib/i18n";

// Pinned: Polish + English on top, then alphabetically by autonym
const NATIVE_LANGUAGES = [
  { id: "pl", label: "Polski" },
  { id: "en", label: "English" },
  { id: "_sep", label: "───" },
  { id: "ar", label: "العربية" },
  { id: "bg", label: "Български" },
  { id: "cs", label: "Čeština" },
  { id: "da", label: "Dansk" },
  { id: "de", label: "Deutsch" },
  { id: "el", label: "Ελληνικά" },
  { id: "es", label: "Español" },
  { id: "fi", label: "Suomi" },
  { id: "fr", label: "Français" },
  { id: "hi", label: "हिन्दी" },
  { id: "hr", label: "Hrvatski" },
  { id: "hu", label: "Magyar" },
  { id: "id", label: "Bahasa Indonesia" },
  { id: "it", label: "Italiano" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
  { id: "lt", label: "Lietuvių" },
  { id: "nl", label: "Nederlands" },
  { id: "no", label: "Norsk" },
  { id: "pt", label: "Português" },
  { id: "ro", label: "Română" },
  { id: "ru", label: "Русский" },
  { id: "sk", label: "Slovenčina" },
  { id: "sl", label: "Slovenščina" },
  { id: "sv", label: "Svenska" },
  { id: "th", label: "ไทย" },
  { id: "tr", label: "Türkçe" },
  { id: "uk", label: "Українська" },
  { id: "vi", label: "Tiếng Việt" },
  { id: "zh", label: "中文" },
  { id: "other", label: "—" },
];

const DURATIONS = [5, 10];


export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Auth
  const [email, setEmail] = useState("");

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("pl");
  const [uiLanguage, setUiLanguage] = useState("en");

  // Learning
  const [currentLevel, setCurrentLevel] = useState("A1");
  const [preferredDuration, setPreferredDuration] = useState(10);
  const [reminders, setReminders] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        setEmail(user.email ?? "");

        const res = await fetch("/api/user/profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();

        // Fetch user display_name and native_language from users table
        const { data: userData } = await supabase
          .from("users")
          .select("display_name, native_language, ui_language")
          .eq("id", user.id)
          .single();

        setDisplayName(userData?.display_name ?? "");
        setNativeLanguage(userData?.native_language ?? "pl");
        setUiLanguage(userData?.ui_language ?? "en");
        setCurrentLevel(profile?.current_level ?? "A1");
        setPreferredDuration(profile?.preferred_duration_min ?? 10);
        setReminders(profile?.reminders_enabled ?? false);
      } catch (err) {
        console.error("Settings fetch error:", err);
        setError("settingsLoadError");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          native_language: nativeLanguage,
          ui_language: uiLanguage,
          preferred_duration_min: preferredDuration,
          reminders_enabled: reminders,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Blad zapisu");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blad zapisu ustawien");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    clearActiveChild();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-text-primary">{t("settingsTitle")}</h1>

      {/* Profil */}
      <section className="mb-6 rounded-2xl border border-border bg-bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">{t("profile")}</h2>
        </div>

        <div className="space-y-4">
          {/* Imie */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t("name")}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-text-primary outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t("email")}
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-text-secondary opacity-60"
            />
          </div>

          {/* Jezyk ojczysty */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t("nativeLanguage")}
            </label>
            <select
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              className="w-full appearance-none rounded-lg border border-border bg-bg-dark bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pl-3 pr-10 py-2 text-text-primary outline-none transition-colors focus:border-primary"
            >
              {NATIVE_LANGUAGES.map((lang) =>
                lang.id === "_sep" ? (
                  <option key="_sep" disabled>
                    {lang.label}
                  </option>
                ) : (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                )
              )}
            </select>
          </div>

          {/* UI Language */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t("uiLanguage")}
            </label>
            <select
              value={uiLanguage}
              onChange={(e) => setUiLanguage(e.target.value)}
              className="w-full appearance-none rounded-lg border border-border bg-bg-dark bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pl-3 pr-10 py-2 text-text-primary outline-none transition-colors focus:border-primary"
            >
              <option value="pl">🇵🇱 Polski</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </div>
      </section>

      {/* Nauka */}
      <section className="mb-6 rounded-2xl border border-border bg-bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">{t("learning")}</h2>
        </div>

        <div className="space-y-4">
          {/* Aktualny poziom */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t("currentLevel")}
            </label>
            <div className="rounded-lg border border-border bg-bg-dark px-3 py-2 text-text-secondary opacity-60">
              {currentLevel} — {t("levelAutoAdjusts")}
            </div>
          </div>

          {/* Czas lekcji */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t("lessonTime")}
            </label>
            <select
              value={preferredDuration}
              onChange={(e) => setPreferredDuration(Number(e.target.value))}
              className="w-full appearance-none rounded-lg border border-border bg-bg-dark bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pl-3 pr-10 py-2 text-text-primary outline-none transition-colors focus:border-primary"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </div>

          {/* Przypomnienia */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-secondary">
              {t("reminders")}
            </label>
            <button
              onClick={() => setReminders(!reminders)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                reminders ? "bg-primary" : "bg-bg-card-hover"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  reminders ? "translate-x-[22px]" : "translate-x-[2px]"
                } mt-[2px]`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Konta dzieci */}
      <ChildrenSection />

      {/* Plan i rozliczenia */}
      <section className="mb-6 rounded-2xl border border-border bg-bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">{t("billingTitle")}</h2>
        </div>
        <p className="mb-3 text-sm text-text-secondary">{t("billingDesc")}</p>
        <Link
          href="/app/settings/billing"
          className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          {t("billingManage")}
        </Link>
      </section>

      {/* Konto */}
      <section className="mb-8 rounded-2xl border border-border bg-bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <LogOut className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-text-primary">{t("account")}</h2>
        </div>

        <button
          onClick={handleSignOut}
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
        >
          {t("logout")}
        </button>
      </section>

      {/* Status messages */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {t(error)}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {t("settingsSaved")}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saving ? t("saving") : t("save")}
      </button>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, BookOpen, Target, LogOut, Save, Loader2 } from "lucide-react";

const NATIVE_LANGUAGES = [
  { id: "pl", name: "Polski" },
  { id: "en", name: "Angielski" },
  { id: "uk", name: "Ukrainski" },
  { id: "other", name: "Inne" },
];

const DURATIONS = [5, 10, 15, 20, 30];

const FREQUENCIES = [
  { id: "daily", label: "Codziennie" },
  { id: "3-4x", label: "3-4x w tygodniu" },
  { id: "2-3x", label: "2-3x w tygodniu" },
  { id: "1x", label: "Raz w tygodniu" },
];

const TIMES = [
  { id: "morning", label: "Rano" },
  { id: "day", label: "W ciagu dnia" },
  { id: "evening", label: "Wieczorem" },
  { id: "any", label: "Bez preferencji" },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Auth
  const [email, setEmail] = useState("");

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("pl");

  // Learning
  const [currentLevel, setCurrentLevel] = useState("A1");
  const [preferredDuration, setPreferredDuration] = useState(15);
  const [preferredFrequency, setPreferredFrequency] = useState("3-4x");
  const [preferredTime, setPreferredTime] = useState("any");
  const [reminders, setReminders] = useState(false);

  // Weekly goal
  const [weeklyMinutesGoal, setWeeklyMinutesGoal] = useState(30);

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
          .select("display_name, native_language")
          .eq("id", user.id)
          .single();

        // Fetch streak data
        const { data: streak } = await supabase
          .from("streaks")
          .select("weekly_minutes_goal")
          .eq("user_id", user.id)
          .single();

        setDisplayName(userData?.display_name ?? "");
        setNativeLanguage(userData?.native_language ?? "pl");
        setCurrentLevel(profile?.current_level ?? "A1");
        setPreferredDuration(profile?.preferred_duration_min ?? 15);
        setPreferredFrequency(profile?.preferred_frequency ?? "3-4x");
        setPreferredTime(profile?.preferred_time ?? "any");
        setReminders(profile?.reminders_enabled ?? false);
        setWeeklyMinutesGoal(streak?.weekly_minutes_goal ?? 30);
      } catch (err) {
        console.error("Settings fetch error:", err);
        setError("Nie udalo sie zaladowac ustawien");
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
          preferred_duration_min: preferredDuration,
          preferred_frequency: preferredFrequency,
          preferred_time: preferredTime,
          reminders_enabled: reminders,
          weekly_minutes_goal: weeklyMinutesGoal,
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
      <h1 className="mb-8 text-2xl font-bold text-text-primary">Ustawienia</h1>

      {/* Profil */}
      <section className="mb-6 rounded-2xl border border-border bg-bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Profil</h2>
        </div>

        <div className="space-y-4">
          {/* Imie */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Imie
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
              Email
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
              Jezyk ojczysty
            </label>
            <select
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-text-primary outline-none transition-colors focus:border-primary"
            >
              {NATIVE_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Nauka */}
      <section className="mb-6 rounded-2xl border border-border bg-bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Nauka</h2>
        </div>

        <div className="space-y-4">
          {/* Aktualny poziom */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Aktualny poziom
            </label>
            <div className="rounded-lg border border-border bg-bg-dark px-3 py-2 text-text-secondary opacity-60">
              {currentLevel} — zmienia sie automatycznie
            </div>
          </div>

          {/* Czas lekcji */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Czas lekcji
            </label>
            <select
              value={preferredDuration}
              onChange={(e) => setPreferredDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-text-primary outline-none transition-colors focus:border-primary"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </div>

          {/* Czestotliwosc */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Czestotliwosc
            </label>
            <select
              value={preferredFrequency}
              onChange={(e) => setPreferredFrequency(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-text-primary outline-none transition-colors focus:border-primary"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pora dnia */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Pora dnia
            </label>
            <select
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-text-primary outline-none transition-colors focus:border-primary"
            >
              {TIMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Przypomnienia */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-secondary">
              Przypomnienia
            </label>
            <button
              onClick={() => setReminders(!reminders)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                reminders ? "bg-primary" : "bg-bg-card-hover"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  reminders ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Cel tygodniowy */}
      <section className="mb-6 rounded-2xl border border-border bg-bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">
            Cel tygodniowy
          </h2>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            {weeklyMinutesGoal} minut / tydzien
          </label>
          <input
            type="range"
            min={10}
            max={120}
            step={5}
            value={weeklyMinutesGoal}
            onChange={(e) => setWeeklyMinutesGoal(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-xs text-text-secondary">
            <span>10 min</span>
            <span>120 min</span>
          </div>
        </div>
      </section>

      {/* Konto */}
      <section className="mb-8 rounded-2xl border border-border bg-bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <LogOut className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-text-primary">Konto</h2>
        </div>

        <button
          onClick={handleSignOut}
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
        >
          Wyloguj sie
        </button>
      </section>

      {/* Status messages */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          Ustawienia zapisane
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
        Zapisz zmiany
      </button>
    </main>
  );
}

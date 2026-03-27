"use client";

import { useState, useEffect } from "react";
import { sendMagicLink } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "@/lib/i18n";
import { UILanguageToggle, getStoredUILocale } from "@/components/ui-language-toggle";

export default function LoginPage() {
  const [locale, setLocale] = useState<"pl" | "en">("en");
  useEffect(() => { setLocale(getStoredUILocale()); }, []);
  const t = (key: string) => getTranslations(locale)[key] ?? key;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Handle #access_token hash from Supabase magic link redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      const supabase = createClient();
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (!error) {
            // Notify admin about login (fire-and-forget)
            fetch("/api/auth/notify-login", { method: "POST" }).catch(() => {});
            // Full page navigation so server picks up fresh auth cookies
            window.location.href = "/dashboard";
          }
        });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await sendMagicLink(email, locale);

    if (result.success) {
      setSent(true);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
        <UILanguageToggle className="absolute top-4 right-4" />
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t("checkInbox")}</h1>
          <p className="text-text-secondary">
            {t("linkSent")}{" "}
            <span className="font-medium text-text-primary">{email}</span>
          </p>
          <p className="text-sm text-text-secondary">
            {t("linkValidFor")}
          </p>
          <button
            onClick={() => {
              setSent(false);
              setError("");
            }}
            className="text-sm text-primary hover:underline"
          >
            {t("useOtherEmail")}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <UILanguageToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <div className="overflow-hidden rounded-xl" style={{ width: 40, height: 40 }}>
              <Image src="/logo-icon.png" alt="Godoj" width={80} height={80} className="h-full w-full object-cover" style={{ width: 40, height: 40 }} priority />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>Godoj.co</span>
          </div>
          <p className="text-text-secondary">
            {t("loginTitle")}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <p className="text-xs text-on-surface-variant text-center">
            {t("loginSubtitle")}
          </p>
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              required
              className="w-full rounded-lg border border-border bg-bg-card px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t("sendLoginLink")
            )}
          </button>
        </form>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}

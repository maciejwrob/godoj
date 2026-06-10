"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n-data";
import { UILanguageToggle, getStoredUILocale } from "@/components/ui-language-toggle";

type Currency = "PLN" | "EUR" | "USD";
const CURRENCIES: Currency[] = ["PLN", "EUR", "USD"];
// Whole-number prices per currency; beta -50% halves cleanly and Stripe
// amount-off coupons charge EXACTLY what we display (45/90, $12/$24, €10/€20)
const PRICE_TABLE: Record<Currency, { starterFull: number; starterBeta: number; proFull: number; proBeta: number; tutorRate: string }> = {
  PLN: { starterFull: 89, starterBeta: 45, proFull: 179, proBeta: 90, tutorRate: "od 120 PLN/godz|from 120 PLN/h" },
  EUR: { starterFull: 20, starterBeta: 10, proFull: 40,  proBeta: 20, tutorRate: "od €30/godz|from €30/h" },
  USD: { starterFull: 24, starterBeta: 12, proFull: 48,  proBeta: 24, tutorRate: "od $30/godz|from $30/h" },
};
const fmtPrice = (n: number, c: Currency) => (c === "PLN" ? `${n} PLN` : c === "USD" ? `$${n}` : `€${n}`);

export default function PricingPage() {
  const [locale, setLocale] = useState<"pl" | "en">("en");
  const [currency, setCurrency] = useState<Currency>("PLN");

  useEffect(() => {
    const l = getStoredUILocale();
    setLocale(l);
    const stored = localStorage.getItem("godoj_currency");
    if (stored === "PLN" || stored === "EUR" || stored === "USD") setCurrency(stored);
    else setCurrency(l === "pl" ? "PLN" : "USD");
  }, []);

  const changeCurrency = (c: Currency) => {
    setCurrency(c);
    localStorage.setItem("godoj_currency", c);
  };

  const P = PRICE_TABLE[currency];
  const perHour = (beta: number, minutes: number) => Math.round(beta / (minutes / 60));
  const tutorRate = P.tutorRate.split("|");

  const i18n = getTranslations(locale);
  const t = (key: string) => i18n[key] ?? key;

  // Inline translations for keys not in the global i18n
  const pt = (pl: string, en: string) => (locale === "pl" ? pl : en);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      {/* ===================== STICKY HEADER ===================== */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-surface/80 backdrop-blur-sm">
        <div className="relative mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3 sm:px-10 lg:px-14 xl:px-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-xl">
              <Image src="/logo-icon.png" alt="Godoj" width={72} height={72} className="h-full w-full object-cover" priority />
            </div>
            <span
              className="text-xl font-extrabold tracking-tight text-white"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              Godoj.co
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
            <Link
              href="/pricing"
              className="text-sm font-medium text-white transition-colors"
            >
              {t("navPricing")}
            </Link>
            <Link
              href="/method"
              className="text-sm font-medium text-on-surface-variant hover:text-white transition-colors"
            >
              {pt("Metoda", "Method")}
            </Link>
          </nav>
          <div className="flex items-center gap-3 sm:gap-4">
            <UILanguageToggle />
            <Link
              href="/login"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-all"
            >
              {t("navLogin")}
            </Link>
          </div>
        </div>
      </header>

      {/* ===================== MAIN CONTENT ===================== */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-12 sm:px-10 sm:py-16 lg:py-20">

        {/* ---------- 1. Title section ---------- */}
        <section className="text-center mb-10 sm:mb-14">
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            {pt(
              "Ile kosztuje rozmowa z AI tutorem?",
              "How much does an AI tutor conversation cost?"
            )}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            {pt(
              "Tańszy niż prywatny lektor. Dostępny 24/7. Bez umówionej lekcji.",
              "Cheaper than a private tutor. Available 24/7. No appointments."
            )}
          </p>
        </section>

        {/* ---------- 2. Beta promo banner ---------- */}
        <section className="mb-10 sm:mb-14">
          <div className="relative rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-emerald-500/10 p-5 sm:p-6 text-center overflow-hidden">
            {/* Subtle shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/5 to-transparent" />
            <div className="relative">
              <span className="inline-block rounded-full bg-emerald-500 px-3.5 py-1 text-xs font-bold text-white tracking-wide mb-3">
                BETA -50%
              </span>
              <p className="text-lg sm:text-xl font-bold text-white">
                {pt(
                  "Połowa ceny przez pierwsze 3 miesiące!",
                  "Half price for the first 3 months!"
                )}
              </p>
              <p className="mt-2 text-sm text-emerald-400/80">
                {pt("Oferta ważna do 30.06.2026", "Offer valid until June 30, 2026")}
              </p>
            </div>
          </div>
        </section>

        {/* ---------- 3. Pricing cards ---------- */}
        <section className="mb-14 sm:mb-20">
          {/* Currency switcher */}
          <div className="mb-5 flex items-center justify-center gap-1.5">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => changeCurrency(c)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  currency === c ? "bg-white/15 text-white border border-white/20" : "text-white/40 hover:text-white border border-transparent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
            {/* Starter card */}
            <div className="relative border border-white/10 bg-surface-container rounded-2xl p-6 sm:p-8 flex flex-col">
              <h3
                className="text-xl font-bold text-white mb-5"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                Starter
              </h3>

              {/* Price */}
              <div className="mb-5">
                <span className="text-sm text-white/40 line-through mr-2">{fmtPrice(P.starterFull, currency)}{pt("/mies", "/mo")}</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span
                    className="text-4xl sm:text-5xl font-extrabold text-white"
                    style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                  >
                    {fmtPrice(P.starterBeta, currency)}
                  </span>
                  <span className="text-lg text-white/60 font-medium">{pt("/mies", "/mo")}</span>
                </div>
              </div>

              {/* Minutes — the headline feature */}
              <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-xl">🕐</span>
                <span className="text-lg font-extrabold text-white">{pt("90 minut rozmów", "90 minutes of speaking")}</span>
                <span className="text-sm text-white/50">/ {pt("mies.", "mo")}</span>
              </div>
              <p className="mb-2 flex items-center gap-2 text-sm text-white/70">
                <span>🌐</span>{pt("1 język do nauki", "1 language")}
              </p>

              {/* Per hour comparison */}
              <div className="mb-8">
                <span className="text-sm font-semibold text-emerald-400">~{fmtPrice(perHour(P.starterBeta, 90), currency)}{pt("/godz", "/h")}</span>
                <span className="text-sm text-white/40 ml-2">
                  ({pt("prywatny lektor:", "private tutor:")} {pt(tutorRate[0], tutorRate[1])})
                </span>
              </div>

              {/* CTA */}
              <div className="mt-auto">
                <Link
                  href="/login"
                  className="block w-full text-center rounded-xl bg-godoj-blue py-3.5 text-base font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  {pt("Zacznij za darmo", "Start for free")}
                </Link>
                <p className="text-center text-xs text-white/30 mt-2.5">
                  {pt("15 minut za darmo na start", "15 free minutes to get started")}
                </p>
              </div>
            </div>

            {/* Pro card */}
            <div className="relative border border-godoj-blue/50 bg-godoj-blue/5 rounded-2xl p-6 sm:p-8 flex flex-col">
              {/* Popular badge */}
              <div className="absolute -top-3 right-6">
                <span className="inline-block rounded-full bg-godoj-blue px-4 py-1 text-xs font-bold text-white shadow-lg shadow-godoj-blue/20">
                  {pt("Najpopularniejszy", "Most popular")}
                </span>
              </div>

              <h3
                className="text-xl font-bold text-white mb-5"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                Pro
              </h3>

              {/* Price */}
              <div className="mb-5">
                <span className="text-sm text-white/40 line-through mr-2">{fmtPrice(P.proFull, currency)}{pt("/mies", "/mo")}</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span
                    className="text-4xl sm:text-5xl font-extrabold text-white"
                    style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                  >
                    {fmtPrice(P.proBeta, currency)}
                  </span>
                  <span className="text-lg text-white/60 font-medium">{pt("/mies", "/mo")}</span>
                </div>
              </div>

              {/* Minutes — the headline feature */}
              <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-godoj-blue/20 bg-godoj-blue/10 px-4 py-3">
                <span className="text-xl">🕐</span>
                <span className="text-lg font-extrabold text-white">{pt("250 minut rozmów", "250 minutes of speaking")}</span>
                <span className="text-sm text-white/50">/ {pt("mies.", "mo")}</span>
              </div>
              <p className="mb-2 flex items-center gap-2 text-sm text-white/70">
                <span>🌐</span>{pt("2 języki jednocześnie", "2 languages at once")}
              </p>

              {/* Per hour comparison */}
              <div className="mb-8">
                <span className="text-sm font-semibold text-emerald-400">~{fmtPrice(perHour(P.proBeta, 250), currency)}{pt("/godz", "/h")}</span>
                <span className="text-sm text-white/40 ml-2">
                  ({pt("prywatny lektor:", "private tutor:")} {pt(tutorRate[0], tutorRate[1])})
                </span>
              </div>

              {/* CTA */}
              <div className="mt-auto">
                <Link
                  href="/login"
                  className="block w-full text-center rounded-xl bg-godoj-blue py-3.5 text-base font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  {pt("Zacznij za darmo", "Start for free")}
                </Link>
                <p className="text-center text-xs text-white/30 mt-2.5">
                  {pt("15 minut za darmo na start", "15 free minutes to get started")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 4. Comparison section ---------- */}
        <section className="mb-14 sm:mb-20">
          <h2
            className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 sm:mb-10"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            {pt("Godoj Pro vs prywatny lektor", "Godoj Pro vs private tutor")}
          </h2>

          <div className="space-y-3">
            {[
              {
                label: pt("Cena za godzinę", "Price per hour"),
                godoj: `~${fmtPrice(perHour(P.proBeta, 250), currency)}`,
                tutor: pt(tutorRate[0].replace("/godz", ""), tutorRate[1].replace("/h", "")),
              },
              {
                label: pt("Dostępność", "Availability"),
                godoj: "24/7",
                tutor: pt("Do umówienia", "By appointment"),
              },
              {
                label: pt("Dojazd", "Commute"),
                godoj: pt("Z kanapy", "From your couch"),
                tutor: pt("Musisz dojechać", "You commute"),
              },
              {
                label: pt("Anulowanie", "Cancellation"),
                godoj: pt("Kiedy chcesz", "Anytime"),
                tutor: pt("24h wcześniej", "24h in advance"),
              },
              {
                label: pt("Poziom", "Level"),
                godoj: pt("Dopasowuje się", "Adapts automatically"),
                tutor: pt("Jednorazowa ocena", "One-time assessment"),
              },
            ].map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-3 gap-3 sm:gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 items-center"
              >
                <span className="text-sm font-medium text-white/60">{row.label}</span>
                <span className="text-sm font-semibold text-emerald-400 text-center">{row.godoj}</span>
                <span className="text-sm text-white/40 text-center">{row.tutor}</span>
              </div>
            ))}

            {/* Column labels */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 px-4 sm:px-5 pt-1">
              <span />
              <span className="text-xs font-bold text-emerald-400/60 text-center uppercase tracking-wide">
                Godoj Pro
              </span>
              <span className="text-xs font-medium text-white/20 text-center uppercase tracking-wide">
                {pt("Prywatny lektor", "Private tutor")}
              </span>
            </div>
          </div>
        </section>

        {/* ---------- 5. "Dlaczego Godoj?" section ---------- */}
        <section className="mb-14 sm:mb-20">
          <h2
            className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 sm:mb-10"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            {pt("Dlaczego Godoj?", "Why Godoj?")}
          </h2>

          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
            {[
              {
                title: pt("Rozmowa, nie ćwiczenia", "Conversation, not drills"),
                desc: pt(
                  "Badania pokazują, że nauka przez rozmowę jest 3-5x skuteczniejsza niż tradycyjne metody.",
                  "Research shows conversation-based learning is 3-5x more effective than traditional methods."
                ),
              },
              {
                title: pt("Myślisz w obcym języku", "Think in a foreign language"),
                desc: pt(
                  "Zamiast tłumaczyć w głowie, ćwiczysz spontaniczną reakcję — jak native speaker.",
                  "Instead of mentally translating, you practice spontaneous responses — like a native speaker."
                ),
              },
              {
                title: pt("5 minut wystarczy", "5 minutes is enough"),
                desc: pt(
                  "Nawet krótka codzienna rozmowa daje lepsze efekty niż godzina nauki raz w tygodniu.",
                  "Even a short daily conversation delivers better results than one hour of study per week."
                ),
              },
              {
                title: pt("Nie jesteśmy Duolingo", "We're not Duolingo"),
                desc: pt(
                  "Żadnych powtarzalnych ćwiczeń. Prawdziwa rozmowa, jak z native speakerem — na Twoim poziomie.",
                  "No repetitive drills. Real conversation, like with a native speaker — at your level."
                ),
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 sm:p-6"
              >
                <h3
                  className="text-base font-bold text-white mb-2"
                  style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                >
                  {card.title}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/method"
              className="inline-block text-sm font-medium text-godoj-blue hover:underline transition-colors"
            >
              {pt(
                "Dowiedz się więcej o naszej metodzie →",
                "Learn more about our method →"
              )}
            </Link>
          </div>
        </section>

        {/* ---------- 6. Final CTA ---------- */}
        <section className="text-center mb-4">
          <div className="rounded-2xl border border-white/10 bg-surface-container p-8 sm:p-10">
            <h2
              className="text-xl sm:text-2xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              {pt(
                "Wypróbuj za darmo — 15 minut bez zobowiązań",
                "Try free — 15 minutes, no commitment"
              )}
            </h2>
            <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
              {pt(
                "Zarejestruj się, włącz mikrofon i zacznij mówić. Bez karty kredytowej.",
                "Sign up, turn on your mic and start speaking. No credit card required."
              )}
            </p>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-godoj-blue px-8 py-3.5 text-base font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
            >
              {pt("Zacznij za darmo", "Start for free")}
            </Link>
          </div>
        </section>
      </main>

      {/* ===================== FOOTER ===================== */}
      <footer className="mt-auto border-t border-white/5 px-5 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
            <div className="flex items-center gap-2">
              <Image src="/logo-icon.png" alt="Godoj" width={20} height={20} className="rounded" />
              <span>Godoj.co</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link href="/pricing" className="hover:text-white/60 transition-colors">{t("navPricing")}</Link>
              <Link href="/method" className="hover:text-white/60 transition-colors">{pt("Metoda", "Method")}</Link>
              <span className="text-white/20">|</span>
              <Link href="/terms-of-service" className="hover:text-white/60 transition-colors">{t("tosLink")}</Link>
              <Link href="/privacy-policy" className="hover:text-white/60 transition-colors">{t("privacyLink")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { track } from "@/lib/analytics";

interface Subscription {
  tier: string;
  tierNamePl: string;
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  isUnlimited: boolean;
  trialEndsAt?: string | null;
  trialExpired?: boolean;
  trialExtensionUsed?: boolean;
}

// Beta discount config
const BETA_DISCOUNT = 0.5; // 50% off
const BETA_ACTIVE = true;
const BETA_DEADLINE = "30.06.2026";

type Currency = "PLN" | "EUR" | "USD";
const CURRENCIES: Currency[] = ["PLN", "EUR", "USD"];
// Whole-number price points per currency so the -50% beta halves cleanly
// (charges match displayed prices exactly — Stripe uses amount-off coupons)
const PRICE_TABLE: Record<Currency, { starterM: number; starterY: number; proM: number; proY: number; topup: number; tutorRate: string }> = {
  PLN: { starterM: 89, starterY: 854,  proM: 179, proY: 1717, topup: 29, tutorRate: "120+ PLN" },
  EUR: { starterM: 20, starterY: 192,  proM: 40,  proY: 384,  topup: 7,  tutorRate: "€30+" },
  USD: { starterM: 24, starterY: 230,  proM: 48,  proY: 460,  topup: 7,  tutorRate: "$30+" },
};
const fmtPrice = (n: number, c: Currency) => (c === "PLN" ? `${n} PLN` : c === "USD" ? `$${n}` : `€${n}`);

const TOPUP = { minutes: 20 };

const TIERS = [
  { id: "starter", yearlyId: "starter_yearly", name: "Starter", minutes: 90,  weeklyMin: 20, languages: 1, popular: false },
  { id: "pro",     yearlyId: "pro_yearly",     name: "Pro",     minutes: 250, weeklyMin: 57, languages: 2, popular: true },
];

// Simple template: replace {key} with value
function tpl(template: string, params: Record<string, string | number>): string {
  let result = template;
  for (const [k, v] of Object.entries(params)) {
    result = result.replace(`{${k}}`, String(v));
  }
  return result;
}

export default function PricingPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [currency, setCurrency] = useState<Currency>("PLN");

  useEffect(() => {
    const stored = localStorage.getItem("godoj_currency");
    if (stored === "PLN" || stored === "EUR" || stored === "USD") setCurrency(stored);
    else setCurrency(locale === "pl" ? "PLN" : "USD");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const changeCurrency = (c: Currency) => {
    setCurrency(c);
    localStorage.setItem("godoj_currency", c);
    track("currency_changed", { currency: c });
  };

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => {
        setSubscription(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleUpgrade = async (tierId: string) => {
    if (checkoutLoading) return;
    track("checkout_clicked", { tier: tierId, currency });
    setCheckoutLoading(tierId);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId, ui_locale: locale, currency: currency.toLowerCase() }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || t("pricingError"));
        setCheckoutLoading(null);
      }
    } catch {
      alert(t("pricingPaymentError"));
      setCheckoutLoading(null);
    }
  };

  const handleTopup = async () => {
    if (topupLoading) return;
    track("topup_clicked", { currency });
    setTopupLoading(true);
    try {
      const res = await fetch("/api/stripe/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ui_locale: locale, currency: currency.toLowerCase() }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || t("pricingError"));
        setTopupLoading(false);
      }
    } catch {
      alert(t("pricingPaymentError"));
      setTopupLoading(false);
    }
  };

  const [extending, setExtending] = useState(false);
  const handleExtendTrial = async () => {
    if (extending) return;
    setExtending(true);
    try {
      const res = await fetch("/api/trial/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ui_locale: locale }),
      });
      const data = await res.json();
      if (data.success) window.location.reload();
      else { alert(data.error || t("pricingError")); setExtending(false); }
    } catch { alert(t("pricingError")); setExtending(false); }
  };

  const currentTier = subscription?.tier ?? "free";
  const currentTierBase = currentTier.replace("_yearly", "");

  const isTrial = currentTierBase === "free";
  const trialMinutesLeft = subscription ? Math.round(subscription.minutesRemaining) : 30;
  const isYearly = billingInterval === "year";
  const hasBetaDiscount = BETA_ACTIVE && !isYearly;

  // Native tutor cost for comparison
  const P = PRICE_TABLE[currency];
  const nativeTutorRate = P.tutorRate;
  const perHourLabel = locale === "pl" ? "/godz" : "/hr";
  const nativeLabel = locale === "pl" ? "prywatny lektor" : "private tutor";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">{t("pricingTitle")}</h1>
        <p className="mt-2 text-slate-400">
          {t("pricingSubtitle")}
        </p>
      </div>

      {/* Trial banner */}
      {isTrial && (
        <div className={`mb-6 rounded-2xl border p-5 text-center ${
          subscription?.trialExpired ? "border-red-500/25 bg-red-500/5" : "border-yellow-500/20 bg-yellow-500/5"
        }`}>
          <p className={`text-sm font-medium ${subscription?.trialExpired ? "text-red-300" : "text-yellow-300"}`}>
            {subscription?.trialExpired || trialMinutesLeft <= 0
              ? t("pricingTrialExpired")
              : tpl(t("pricingTrialRemaining"), { minutes: trialMinutesLeft })}
          </p>
          {!subscription?.trialExpired && subscription?.trialEndsAt && trialMinutesLeft > 0 && (
            <p className="mt-1 text-xs text-yellow-300/60">
              {locale === "pl" ? "Okres próbny kończy się" : "Trial ends"} {new Date(subscription.trialEndsAt).toLocaleDateString(locale === "pl" ? "pl-PL" : "en-US", { day: "numeric", month: "long" })}
            </p>
          )}
          {subscription?.trialExpired && !subscription?.trialExtensionUsed && (
            <button
              onClick={handleExtendTrial}
              disabled={extending}
              className="mt-3 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20 border border-white/10 transition-all disabled:opacity-50"
            >
              {extending
                ? (locale === "pl" ? "Przedłużam…" : "Extending…")
                : (locale === "pl" ? "Przedłuż okres próbny o 7 dni (jednorazowo)" : "Extend trial by 7 days (one time)")}
            </button>
          )}
        </div>
      )}

      {/* Beta promo banner */}
      {BETA_ACTIVE && (
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-green-500/10 to-emerald-500/15 p-6 text-center">
          <div className="pointer-events-none absolute -left-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-green-500/10 blur-2xl" />

          <div className="relative">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-extrabold text-white">
              <span className="text-lg">🔥</span>
              {t("pricingBetaBadge")}
              <span className="text-lg">🔥</span>
            </div>
            <p className="mt-2 text-base font-bold text-white">
              {t("pricingBetaDesc")}
            </p>
            <p className="mt-1 text-sm text-emerald-300/70">
              {tpl(t("pricingBetaDeadline"), { date: BETA_DEADLINE })}
            </p>
          </div>
        </div>
      )}

      {/* Currency switcher */}
      <div className="mb-4 flex items-center justify-center gap-1.5">
        {CURRENCIES.map((c) => (
          <button
            key={c}
            onClick={() => changeCurrency(c)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
              currency === c ? "bg-white/15 text-white border border-white/20" : "text-slate-500 hover:text-white border border-transparent"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Billing interval toggle */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingInterval("month")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
            billingInterval === "month"
              ? "bg-white text-surface shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {t("pricingMonthly")}
          {BETA_ACTIVE && (
            <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${
              billingInterval === "month"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-500 text-white"
            }`}>
              -50%
            </span>
          )}
        </button>
        <button
          onClick={() => setBillingInterval("year")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
            billingInterval === "year"
              ? "bg-white text-surface shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {t("pricingYearly")}
          <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${
            billingInterval === "year"
              ? "bg-green-600 text-white"
              : "bg-green-500 text-white"
          }`}>
            -20%
          </span>
        </button>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        {TIERS.map((tier) => {
          const monthlyPrice = tier.id === "starter" ? P.starterM : P.proM;
          const yearlyPrice = tier.id === "starter" ? P.starterY : P.proY;
          const fullPrice = isYearly ? yearlyPrice : monthlyPrice;
          const price = hasBetaDiscount ? Math.round(fullPrice * (1 - BETA_DISCOUNT)) : fullPrice;
          const monthlyEquiv = isYearly && yearlyPrice > 0
            ? Math.round(yearlyPrice / 12)
            : price;
          const savings = hasBetaDiscount ? fullPrice - price : 0;
          const checkoutTierId = isYearly && tier.yearlyId ? tier.yearlyId : tier.id;
          const isCurrent = currentTierBase === tier.id;
          const isDowngrade =
            TIERS.findIndex((t) => t.id === currentTierBase) >
            TIERS.findIndex((t) => t.id === tier.id);

          // Price per hour calculation
          const hoursPerMonth = tier.minutes / 60;
          const displayPrice = hasBetaDiscount ? price : (isYearly ? monthlyEquiv : price);
          const pricePerHour = Math.round(displayPrice / hoursPerMonth);

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                tier.popular
                  ? "border-godoj-blue/50 bg-godoj-blue/5 shadow-lg shadow-godoj-blue/10"
                  : "border-white/10 bg-surface-container"
              } ${isCurrent ? "ring-2 ring-godoj-blue/30" : ""}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-godoj-blue px-4 py-1 text-xs font-bold text-white">
                  {t("pricingMostPopular")}
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{tier.name}</h2>
                  {hasBetaDiscount && (
                    <span className="rounded-md bg-emerald-500 px-2 py-0.5 text-xs font-extrabold text-white">
                      -50%
                    </span>
                  )}
                </div>

                {/* Price display */}
                <div className="mt-3">
                  {hasBetaDiscount ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-medium text-slate-500 line-through decoration-red-400/60 decoration-2">
                          {fmtPrice(fullPrice, currency)}{t("pricingPerMonth")}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-white">
                          {fmtPrice(price, currency)}
                        </span>
                        <span className="text-sm text-slate-400">{t("pricingPerMonth")}</span>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                        <span>💰</span>
                        {tpl(t("pricingSavings"), { amount: fmtPrice(savings, currency) })}
                      </div>
                    </>
                  ) : isYearly ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-white">
                          {fmtPrice(monthlyEquiv, currency)}
                        </span>
                        <span className="text-sm text-slate-400">{t("pricingPerMonth")}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm text-slate-400">
                          {fmtPrice(price, currency)}{t("pricingPerYear")}
                        </span>
                        <span className="text-xs font-medium text-slate-500 line-through">
                          {fmtPrice(monthlyPrice * 12, currency)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-white">
                        {fmtPrice(price, currency)}
                      </span>
                      <span className="text-sm text-slate-400">{t("pricingPerMonth")}</span>
                    </div>
                  )}
                </div>

                {/* Minutes — the headline feature of every plan */}
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="material-symbols-outlined text-primary">schedule</span>
                    <span className="text-xl font-extrabold text-white">{tier.minutes} {locale === "pl" ? "minut" : "minutes"}</span>
                    <span className="text-sm text-slate-400">/ {locale === "pl" ? "mies." : "mo"}</span>
                  </div>
                  <p className="flex items-center gap-1.5 text-sm text-white/70">
                    <span className="material-symbols-outlined text-base text-slate-400">language</span>
                    {tier.languages === 1
                      ? (locale === "pl" ? "1 język do nauki" : "1 language")
                      : (locale === "pl" ? `${tier.languages} języki jednocześnie` : `${tier.languages} languages at once`)}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-emerald-400">
                      ~{fmtPrice(pricePerHour, currency)}{perHourLabel}
                    </span>
                    <span className="text-slate-500">
                      vs {nativeTutorRate}{perHourLabel} ({nativeLabel})
                    </span>
                  </div>
                </div>
              </div>

              {isCurrent ? (
                <button
                  disabled
                  className="mt-auto w-full rounded-xl bg-white/5 py-3 text-sm font-medium text-slate-400"
                >
                  {t("pricingYourPlan")}
                </button>
              ) : isDowngrade ? (
                <button
                  disabled
                  className="mt-auto w-full rounded-xl bg-white/5 py-3 text-sm font-medium text-slate-500"
                >
                  —
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(checkoutTierId)}
                  disabled={!!checkoutLoading || loading}
                  className={`mt-auto w-full rounded-xl py-3.5 text-sm font-bold transition-all ${
                    tier.popular
                      ? "bg-godoj-blue text-white hover:bg-godoj-blue/90 shadow-lg shadow-godoj-blue/25"
                      : "bg-white/10 text-white hover:bg-white/20"
                  } disabled:opacity-50`}
                >
                  {checkoutLoading === checkoutTierId ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t("pricingRedirecting")}
                    </span>
                  ) : hasBetaDiscount ? (
                    tpl(t("pricingSelectFor"), { name: tier.name, price: fmtPrice(price, currency) })
                  ) : (
                    tpl(t("pricingSelect"), { name: tier.name })
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Top-up section — only for paid subscribers (not trial, not friends & family) */}
      {currentTierBase !== "free" && !subscription?.isUnlimited && (
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 bg-surface-container p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white">{t("pricingNeedMore")}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {tpl(t("pricingTopupDesc"), { minutes: TOPUP.minutes, price: fmtPrice(P.topup, currency) })}
              </p>
            </div>
            <button
              onClick={handleTopup}
              disabled={topupLoading}
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {topupLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {t("pricingTopupLoading")}
                </span>
              ) : (
                tpl(t("pricingTopupBtn"), { minutes: TOPUP.minutes })
              )}
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 text-center">
        <p className="text-sm text-slate-500">
          {t("pricingStripeNote")}
        </p>
        <button
          onClick={() => router.push("/app/settings/billing")}
          className="mt-2 text-sm text-godoj-blue hover:underline"
        >
          {t("pricingManageSub")}
        </button>
      </div>
    </div>
  );
}

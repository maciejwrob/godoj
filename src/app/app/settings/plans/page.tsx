"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

interface Subscription {
  tier: string;
  tierNamePl: string;
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  isUnlimited: boolean;
}

// Beta discount config
const BETA_DISCOUNT = 0.5; // 50% off
const BETA_ACTIVE = true;
const BETA_DEADLINE = "30.06.2026";

const TOPUP = { minutes: 20, price: 29 };

const TIERS = [
  {
    id: "starter",
    yearlyId: "starter_yearly",
    name: "Starter",
    monthlyPrice: 89,
    yearlyPrice: 854,
    minutes: 90,
    weeklyMin: 20,
    popular: false,
  },
  {
    id: "pro",
    yearlyId: "pro_yearly",
    name: "Pro",
    monthlyPrice: 179,
    yearlyPrice: 1717,
    minutes: 250,
    weeklyMin: 57,
    popular: true,
  },
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
    setCheckoutLoading(tierId);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId }),
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
    setTopupLoading(true);
    try {
      const res = await fetch("/api/stripe/topup", { method: "POST" });
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

  const currentTier = subscription?.tier ?? "free";
  const currentTierBase = currentTier.replace("_yearly", "");

  const isTrial = currentTierBase === "free";
  const trialMinutesLeft = subscription ? Math.round(subscription.minutesRemaining) : 30;
  const isYearly = billingInterval === "year";
  const hasBetaDiscount = BETA_ACTIVE && !isYearly;

  // Native tutor cost for comparison
  const nativeTutorRate = locale === "pl" ? "120+ PLN" : "120+ PLN";
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
        <div className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-center">
          <p className="text-sm font-medium text-yellow-300">
            {trialMinutesLeft > 0
              ? tpl(t("pricingTrialRemaining"), { minutes: trialMinutesLeft })
              : t("pricingTrialExpired")}
          </p>
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
          const fullPrice = isYearly ? tier.yearlyPrice : tier.monthlyPrice;
          const price = hasBetaDiscount ? Math.round(fullPrice * (1 - BETA_DISCOUNT)) : fullPrice;
          const monthlyEquiv = isYearly && tier.yearlyPrice > 0
            ? Math.round(tier.yearlyPrice / 12)
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
                          {fullPrice} PLN{t("pricingPerMonth")}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-white">
                          {price}
                        </span>
                        <span className="text-lg font-bold text-white">PLN</span>
                        <span className="text-sm text-slate-400">{t("pricingPerMonth")}</span>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                        <span>💰</span>
                        {tpl(t("pricingSavings"), { amount: savings })}
                      </div>
                    </>
                  ) : isYearly ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-white">
                          {monthlyEquiv}
                        </span>
                        <span className="text-lg font-bold text-white">PLN</span>
                        <span className="text-sm text-slate-400">{t("pricingPerMonth")}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm text-slate-400">
                          {price} PLN{t("pricingPerYear")}
                        </span>
                        <span className="text-xs font-medium text-slate-500 line-through">
                          {tier.monthlyPrice * 12} PLN
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-white">
                        {price}
                      </span>
                      <span className="text-lg font-bold text-white">PLN</span>
                      <span className="text-sm text-slate-400">{t("pricingPerMonth")}</span>
                    </div>
                  )}
                </div>

                {/* Minutes + price per hour */}
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-white/80">
                    {tier.minutes} {t("pricingMinPerMonth")}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-emerald-400">
                      ~{pricePerHour} PLN{perHourLabel}
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
                    tpl(t("pricingSelectFor"), { name: tier.name, price })
                  ) : (
                    tpl(t("pricingSelect"), { name: tier.name })
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Top-up section — only for paid subscribers */}
      {currentTierBase !== "free" && (
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 bg-surface-container p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white">{t("pricingNeedMore")}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {tpl(t("pricingTopupDesc"), { minutes: TOPUP.minutes, price: TOPUP.price })}
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

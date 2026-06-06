"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
    weeklyEquiv: "~20 min/tyg",
    features: [
      "90 minut rozmów miesięcznie",
      "AI tutor głosowy",
      "Szczegółowa analiza lekcji",
      "Śledzenie postępów i XP",
      "Priorytetowe wsparcie",
    ],
    popular: false,
  },
  {
    id: "pro",
    yearlyId: "pro_yearly",
    name: "Pro",
    monthlyPrice: 179,
    yearlyPrice: 1717,
    minutes: 250,
    weeklyEquiv: "~57 min/tyg",
    features: [
      "250 minut rozmów miesięcznie",
      "AI tutor głosowy",
      "Szczegółowa analiza lekcji",
      "Śledzenie postępów i XP",
      "Priorytetowe wsparcie",
      "Dostęp do nowych funkcji",
    ],
    popular: true,
  },
];

export default function PricingPage() {
  const router = useRouter();
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
        alert(data.error || "Wystąpił błąd");
        setCheckoutLoading(null);
      }
    } catch {
      alert("Nie udało się połączyć z systemem płatności");
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
        alert(data.error || "Wystąpił błąd");
        setTopupLoading(false);
      }
    } catch {
      alert("Nie udało się połączyć z systemem płatności");
      setTopupLoading(false);
    }
  };

  const currentTier = subscription?.tier ?? "free";
  // Normalize tier for comparison (starter_yearly -> starter)
  const currentTierBase = currentTier.replace("_yearly", "");

  const isTrial = currentTierBase === "free";
  const trialMinutesLeft = subscription ? Math.round(subscription.minutesRemaining) : 30;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">Wybierz plan</h1>
        <p className="mt-2 text-slate-400">
          Rozmawiaj z AI tutorem i ucz się języków w swoim tempie
        </p>
      </div>

      {/* Trial banner */}
      {isTrial && (
        <div className="mb-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-center">
          <p className="text-sm font-medium text-yellow-300">
            {trialMinutesLeft > 0
              ? `Jesteś na okresie próbnym — pozostało ${trialMinutesLeft} z 30 minut. Wybierz plan, żeby kontynuować naukę po wyczerpaniu limitu.`
              : "Twój okres próbny się skończył. Wybierz plan poniżej, żeby kontynuować naukę."}
          </p>
        </div>
      )}

      {/* Beta banner */}
      {BETA_ACTIVE && (
        <div className="mb-8 rounded-2xl border border-godoj-blue/20 bg-godoj-blue/5 p-4 text-center">
          <span className="inline-block rounded-full bg-godoj-blue/20 px-3 py-1 text-xs font-bold text-godoj-blue">
            -50% BETA przez 3 miesiące · do {BETA_DEADLINE}
          </span>
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
          Miesięcznie
        </button>
        <button
          onClick={() => setBillingInterval("year")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
            billingInterval === "year"
              ? "bg-white text-surface shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Rocznie
          <span className="ml-1.5 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400">
            -20%
          </span>
        </button>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        {TIERS.map((tier) => {
          const isYearly = billingInterval === "year";
          const hasBetaDiscount = BETA_ACTIVE && !isYearly;
          const fullPrice = isYearly ? tier.yearlyPrice : tier.monthlyPrice;
          const price = hasBetaDiscount ? Math.round(fullPrice * (1 - BETA_DISCOUNT)) : fullPrice;
          const monthlyEquiv = isYearly && tier.yearlyPrice > 0
            ? Math.round(tier.yearlyPrice / 12)
            : price;
          const checkoutTierId = isYearly && tier.yearlyId ? tier.yearlyId : tier.id;
          const isCurrent = currentTierBase === tier.id;
          const isDowngrade =
            TIERS.findIndex((t) => t.id === currentTierBase) >
            TIERS.findIndex((t) => t.id === tier.id);

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
                  Najpopularniejszy
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">{tier.name}</h2>
                <div className="mt-3 flex items-baseline gap-2">
                  {isYearly ? (
                    <>
                      <span className="text-3xl font-bold text-white">
                        {monthlyEquiv} PLN
                      </span>
                      <span className="text-sm text-slate-400">/mies</span>
                    </>
                  ) : (
                    <>
                      {hasBetaDiscount && (
                        <span className="text-lg text-slate-500 line-through">
                          {fullPrice}
                        </span>
                      )}
                      <span className="text-3xl font-bold text-white">
                        {price} PLN
                      </span>
                      <span className="text-sm text-slate-400">/mies</span>
                    </>
                  )}
                </div>
                {isYearly && price > 0 && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm text-slate-400">
                      {price} PLN/rok
                    </span>
                    <span className="text-xs font-medium text-green-400 line-through decoration-slate-500">
                      {tier.monthlyPrice * 12} PLN
                    </span>
                  </div>
                )}
                <p className="mt-1 text-sm text-slate-400">
                  {tier.minutes} min/mies ({tier.weeklyEquiv})
                </p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-slate-300"
                  >
                    <span className="material-symbols-outlined mt-0.5 text-base text-green-400">
                      check_circle
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full rounded-xl bg-white/5 py-3 text-sm font-medium text-slate-400"
                >
                  Twój obecny plan
                </button>
              ) : isDowngrade ? (
                <button
                  disabled
                  className="w-full rounded-xl bg-white/5 py-3 text-sm font-medium text-slate-500"
                >
                  —
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(checkoutTierId)}
                  disabled={!!checkoutLoading || loading}
                  className={`w-full rounded-xl py-3 text-sm font-bold transition-all ${
                    tier.popular
                      ? "bg-godoj-blue text-white hover:bg-godoj-blue/90"
                      : "bg-white/10 text-white hover:bg-white/20"
                  } disabled:opacity-50`}
                >
                  {checkoutLoading === checkoutTierId ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Przekierowuję...
                    </span>
                  ) : (
                    `Wybierz ${tier.name}`
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
              <h3 className="font-bold text-white">Potrzebujesz więcej minut?</h3>
              <p className="mt-1 text-sm text-slate-400">
                Dokup {TOPUP.minutes} dodatkowych minut za {TOPUP.price} PLN (jednorazowo)
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
                  Ładuję...
                </span>
              ) : (
                `Dokup ${TOPUP.minutes} min`
              )}
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 text-center">
        <p className="text-sm text-slate-500">
          Płatności obsługiwane przez Stripe. Możesz anulować w dowolnym momencie.
        </p>
        <button
          onClick={() => router.push("/settings/billing")}
          className="mt-2 text-sm text-godoj-blue hover:underline"
        >
          Zarządzaj subskrypcją
        </button>
      </div>
    </div>
  );
}

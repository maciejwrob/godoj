"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

interface Subscription {
  tier: string;
  tierNamePl: string;
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  isUnlimited: boolean;
  status: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const success = searchParams.get("success") === "true";
  const topupSuccess = searchParams.get("topup") === "true";

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => {
        setSubscription(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || t("pricingError"));
        setPortalLoading(false);
      }
    } catch {
      alert(t("billingPortalError"));
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-godoj-blue" />
      </div>
    );
  }

  const usagePercent = subscription
    ? subscription.isUnlimited
      ? 0
      : Math.min(
          100,
          (subscription.minutesUsed / subscription.minutesLimit) * 100
        )
    : 0;

  const dateLocale = locale === "pl" ? "pl-PL" : "en-US";
  const periodEndFormatted = subscription?.periodEnd
    ? new Date(subscription.periodEnd).toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const statusLabel =
    subscription?.status === "active"
      ? t("billingActive")
      : subscription?.status === "past_due"
        ? t("billingPastDue")
        : subscription?.status === "canceled"
          ? t("billingCanceled")
          : t("billingInactive");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:py-12">
      <h1 className="mb-8 text-2xl font-bold text-white">{t("billingTitle")}</h1>

      {/* Success banner */}
      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
          <span className="material-symbols-outlined text-green-400">
            check_circle
          </span>
          <div>
            <p className="font-medium text-green-300">
              {t("billingPaymentSuccess")}
            </p>
            <p className="text-sm text-green-400/70">
              {t("billingPlanUpdated")}
            </p>
          </div>
        </div>
      )}

      {/* Top-up success banner */}
      {topupSuccess && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
          <span className="material-symbols-outlined text-green-400">
            add_circle
          </span>
          <div>
            <p className="font-medium text-green-300">
              {t("billingTopupSuccess")}
            </p>
            <p className="text-sm text-green-400/70">
              {t("billingTopupAdded")}
            </p>
          </div>
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-2xl border border-white/10 bg-surface-container p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{t("billingCurrentPlan")}</p>
            <p className="text-xl font-bold text-white">
              {subscription?.tierNamePl ?? t("billingFree")}
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              subscription?.status === "active"
                ? "bg-green-500/10 text-green-400"
                : subscription?.status === "past_due"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-red-500/10 text-red-400"
            }`}
          >
            {statusLabel}
          </div>
        </div>

        {subscription?.cancelAtPeriodEnd && (
          <div className="mt-3 rounded-lg bg-yellow-500/10 px-3 py-2 text-sm text-yellow-400">
            {t("billingCancelAt").replace("{date}", periodEndFormatted ?? t("billingCancelAtEnd"))}
          </div>
        )}

        {periodEndFormatted && !subscription?.cancelAtPeriodEnd && subscription?.tier !== "free" && (
          <p className="mt-2 text-sm text-slate-500">
            {t("billingNextRenewal").replace("{date}", periodEndFormatted)}
          </p>
        )}
      </div>

      {/* Usage card */}
      {subscription && !subscription.isUnlimited && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-surface-container p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">{t("billingUsage")}</p>
            <p className="text-sm font-medium text-white">
              {Math.round(subscription.minutesUsed)} /{" "}
              {subscription.minutesLimit} min
            </p>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent > 90
                  ? "bg-red-500"
                  : usagePercent > 70
                    ? "bg-yellow-500"
                    : "bg-godoj-blue"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-slate-500">
            {t("billingRemaining").replace("{minutes}", String(Math.round(subscription.minutesRemaining)))}
            {periodEndFormatted
              ? ` (${t("billingUntilDate").replace("{date}", periodEndFormatted)})`
              : ` ${t("billingInPeriod")}`}
          </p>

          {usagePercent > 80 && subscription.tier !== "pro" && (
            <div className="mt-4 rounded-lg bg-godoj-blue/10 px-3 py-2">
              <p className="text-sm text-godoj-blue">
                {t("billingNearLimit")}
              </p>
              <Link
                href="/pricing"
                className="mt-1 inline-block text-sm font-bold text-godoj-blue hover:underline"
              >
                {t("billingViewPlans")}
              </Link>
            </div>
          )}
        </div>
      )}

      {subscription?.isUnlimited && (
        <div className="mt-4 rounded-2xl border border-godoj-blue/20 bg-godoj-blue/5 p-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-godoj-blue">
              all_inclusive
            </span>
            <div>
              <p className="font-medium text-white">{t("billingUnlimited")}</p>
              <p className="text-sm text-slate-400">
                {t("billingFnF")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/pricing"
          className="flex items-center justify-center gap-2 rounded-xl bg-godoj-blue px-6 py-3 text-sm font-bold text-white hover:bg-godoj-blue/90 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">upgrade</span>
          {subscription?.tier === "free" ? t("billingUpgrade") : t("billingChangePlan")}
        </Link>

        {subscription?.stripeSubscriptionId && (
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">
              credit_card
            </span>
            {portalLoading ? t("billingOpening") : t("pricingManageSub")}
          </button>
        )}
      </div>
    </div>
  );
}

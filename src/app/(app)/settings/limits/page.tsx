"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, CalendarDays, Zap, HelpCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type UsageData = {
  todayMinutes: number;
  dailyLimit: number;
  monthMinutes: number;
  monthlyLimit: number;
  unlimited?: boolean;
  tier?: string;
};

export default function LimitsPage() {
  const { locale } = useTranslation();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => setUsage(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pl = locale === "pl";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const dailyPct = usage ? Math.min(100, (usage.todayMinutes / usage.dailyLimit) * 100) : 0;
  const monthPct = usage ? Math.min(100, (usage.monthMinutes / usage.monthlyLimit) * 100) : 0;

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {pl ? "Wróć do Dashboard" : "Back to Dashboard"}
        </Link>

        <div>
          <h1 className="text-2xl font-extrabold text-white">
            {pl ? "Limity rozmów" : "Conversation limits"}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {pl ? "Twoje zużycie w ramach darmowego trialu" : "Your usage within the free trial"}
          </p>
        </div>

        {usage?.unlimited ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center space-y-3">
            <Zap className="h-8 w-8 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-emerald-400">
              {pl ? "Masz nielimitowany dostęp" : "You have unlimited access"}
            </h2>
            <p className="text-sm text-on-surface-variant">
              {pl
                ? "Friends & Family — bez limitów dziennych i miesięcznych."
                : "Friends & Family — no daily or monthly limits."}
            </p>
          </div>
        ) : (
          <>
            {/* Daily usage */}
            <div className="rounded-2xl border border-white/5 bg-surface-container p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {pl ? "Limit dzienny" : "Daily limit"}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {pl ? "Resetuje się o północy" : "Resets at midnight"}
                  </p>
                </div>
              </div>
              <div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-3xl font-extrabold text-white tabular-nums">
                    {usage?.todayMinutes ?? 0}
                    <span className="text-lg text-on-surface-variant font-medium"> / {usage?.dailyLimit ?? 10} min</span>
                  </span>
                </div>
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${dailyPct >= 100 ? "bg-red-500" : dailyPct >= 80 ? "bg-amber-500" : "bg-primary"}`}
                    style={{ width: `${dailyPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-on-surface-variant">
                  {pl
                    ? `Zostało ${Math.max(0, (usage?.dailyLimit ?? 10) - (usage?.todayMinutes ?? 0))} minut na dziś`
                    : `${Math.max(0, (usage?.dailyLimit ?? 10) - (usage?.todayMinutes ?? 0))} minutes remaining today`}
                </p>
              </div>
            </div>

            {/* Monthly usage */}
            <div className="rounded-2xl border border-white/5 bg-surface-container p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {pl ? "Limit miesięczny" : "Monthly limit"}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {pl ? "Resetuje się 1. dnia miesiąca" : "Resets on the 1st of each month"}
                  </p>
                </div>
              </div>
              <div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-3xl font-extrabold text-white tabular-nums">
                    {usage?.monthMinutes ?? 0}
                    <span className="text-lg text-on-surface-variant font-medium"> / {usage?.monthlyLimit ?? 100} min</span>
                  </span>
                </div>
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${monthPct >= 100 ? "bg-red-500" : monthPct >= 80 ? "bg-amber-500" : "bg-primary"}`}
                    style={{ width: `${monthPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-on-surface-variant">
                  {pl
                    ? `Zostało ${Math.max(0, (usage?.monthlyLimit ?? 100) - (usage?.monthMinutes ?? 0))} minut w tym miesiącu`
                    : `${Math.max(0, (usage?.monthlyLimit ?? 100) - (usage?.monthMinutes ?? 0))} minutes remaining this month`}
                </p>
              </div>
            </div>

            {/* FAQ */}
            <div className="rounded-2xl border border-white/5 bg-surface-container p-5 space-y-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-on-surface-variant" />
                <h3 className="text-sm font-bold text-white">
                  {pl ? "Często zadawane pytania" : "FAQ"}
                </h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-white">
                    {pl ? "Co się stanie, gdy wykorzystam limit?" : "What happens when I reach the limit?"}
                  </p>
                  <p className="text-on-surface-variant">
                    {pl
                      ? "Nie będziesz mógł rozpocząć nowej rozmowy do resetu limitu. Trwająca rozmowa nie zostanie przerwana."
                      : "You won't be able to start a new conversation until the limit resets. An ongoing conversation won't be interrupted."}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-white">
                    {pl ? "Czy mogę zwiększyć limity?" : "Can I increase the limits?"}
                  </p>
                  <p className="text-on-surface-variant">
                    {pl
                      ? "Pracujemy nad płatnymi planami z wyższymi limitami. Daj znać na maciej@godoj.co jeśli chcesz więcej minut!"
                      : "We're working on paid plans with higher limits. Reach out to maciej@godoj.co if you need more minutes!"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-white">
                    {pl ? "Dlaczego są limity?" : "Why are there limits?"}
                  </p>
                  <p className="text-on-surface-variant">
                    {pl
                      ? "Godoj jest w fazie beta i koszty rozmów AI pokrywamy z własnej kieszeni. Limity pozwalają nam utrzymać serwis darmowo dla wszystkich testerów."
                      : "Godoj is in beta and we're covering AI conversation costs ourselves. Limits let us keep the service free for all testers."}
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing teaser */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center space-y-2">
              <p className="text-sm font-bold text-primary">
                {pl ? "Cennik wkrótce" : "Pricing coming soon"}
              </p>
              <p className="text-xs text-on-surface-variant">
                {pl
                  ? "Przygotowujemy plany z wyższymi limitami rozmów. Obecni testerzy dostaną specjalną ofertę."
                  : "We're preparing plans with higher conversation limits. Current testers will get a special offer."}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Users, BookOpen, Clock, Mic, AlertTriangle, Mail, Shield, ExternalLink, Plus, CreditCard } from "lucide-react";

interface UserSubscription {
  userId: string;
  displayName: string;
  email: string;
  tierId: string;
  status: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  currentPeriodEnd: string | null;
  minutesUsed: number;
  minutesLimit: number;
  topupMinutes: number;
}

interface DashboardData {
  activeUsers: number;
  lessonsThisMonth: number;
  minutesThisMonth: number;
  recentLessons: {
    id: string;
    userName: string;
    agentName: string;
    duration: number;
    createdAt: string;
  }[];
  beta: {
    registered: number;
    limit: number;
    waitlist: number;
    avgPerUser: number;
    topUser: { name: string; email: string; minutes: number } | null;
  };
  magicLinks: {
    sent: number;
    delivered: number;
    clicked: number;
    bounced: number;
    followedUp: number;
    unresolved: { email: string; language: string; sentAt: string }[];
  };
  userSubscriptions: UserSubscription[];
}

const ELEVENLABS_QUOTA_MIN = 250;

const STRIPE_BASE_URL = "https://dashboard.stripe.com/acct_1TfQZBEDUezs7zrx";

const TIER_COLORS: Record<string, string> = {
  free: "bg-zinc-700 text-zinc-200",
  starter: "bg-blue-900 text-blue-200",
  starter_yearly: "bg-blue-900 text-blue-200",
  pro: "bg-purple-900 text-purple-200",
  pro_yearly: "bg-purple-900 text-purple-200",
  friends_family: "bg-amber-900 text-amber-200",
};

const TIER_LABELS: Record<string, string> = {
  free: "Trial",
  starter: "Starter",
  starter_yearly: "Starter (rok)",
  pro: "Pro",
  pro_yearly: "Pro (rok)",
  friends_family: "F&F",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-900 text-green-200",
  canceled: "bg-red-900 text-red-200",
  past_due: "bg-yellow-900 text-yellow-200",
  incomplete: "bg-zinc-700 text-zinc-200",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjustingUser, setAdjustingUser] = useState<string | null>(null);
  const [adjustMinutes, setAdjustMinutes] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  const fetchData = () => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdjustMinutes = async (userId: string) => {
    const mins = parseInt(adjustMinutes, 10);
    if (!mins || mins <= 0) return;
    setAdjustLoading(true);
    try {
      const res = await fetch("/api/admin/adjust-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, minutes: mins }),
      });
      if (res.ok) {
        setAdjustingUser(null);
        setAdjustMinutes("");
        fetchData();
      }
    } catch (err) {
      console.error("Adjust minutes error:", err);
    } finally {
      setAdjustLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-text-secondary">Ładowanie danych...</div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-text-secondary">
        Nie udało się załadować danych.
      </div>
    );
  }

  const quotaPercent = Math.round(
    (data.minutesThisMonth / ELEVENLABS_QUOTA_MIN) * 100
  );

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">
        Panel administracyjny
      </h1>

      {/* Beta Status Card */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Beta status</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-text-secondary text-xs">Zarejestrowani</p>
            <p className="text-xl font-bold text-text-primary">{data.beta.registered} / {data.beta.limit}</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Waitlist</p>
            <p className="text-xl font-bold text-text-primary">{data.beta.waitlist} osób</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">ElevenLabs (miesiąc)</p>
            <p className={`text-xl font-bold ${quotaPercent > 80 ? "text-red-400" : "text-text-primary"}`}>
              {data.minutesThisMonth} / {ELEVENLABS_QUOTA_MIN} min
            </p>
            <p className="text-xs text-text-secondary">{quotaPercent}% wykorzystano</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Średnio na usera</p>
            <p className="text-xl font-bold text-text-primary">{data.beta.avgPerUser} min</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Top user</p>
            {data.beta.topUser ? (
              <>
                <p className="text-sm font-bold text-text-primary">{data.beta.topUser.name}</p>
                <p className="text-xs text-text-secondary">{data.beta.topUser.minutes} min</p>
              </>
            ) : (
              <p className="text-sm text-text-secondary">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Main stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Aktywni użytkownicy (7d)", value: data.activeUsers, icon: Users },
          { label: "Lekcje w tym miesiącu", value: data.lessonsThisMonth, icon: BookOpen },
          { label: "Minuty w tym miesiącu", value: `${data.minutesThisMonth}`, icon: Clock },
          { label: "Limit ElevenLabs", value: `${data.minutesThisMonth} / ${ELEVENLABS_QUOTA_MIN} min`, icon: Mic, subtitle: `${quotaPercent}%` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-bg-card border border-border rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <stat.icon size={20} className="text-primary" />
              <span className="text-text-secondary text-sm">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
            {stat.subtitle && (
              <p className="text-xs text-text-secondary mt-1">{stat.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Magic Link Issues (24h) */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Magic link issues (24h)</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
          <div>
            <p className="text-text-secondary text-xs">Wysłane</p>
            <p className="text-xl font-bold text-text-primary">{data.magicLinks.sent}</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Dostarczone</p>
            <p className="text-xl font-bold text-text-primary">{data.magicLinks.delivered}</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Kliknięte</p>
            <p className="text-xl font-bold text-text-primary">{data.magicLinks.clicked}</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Bounce</p>
            <p className={`text-xl font-bold ${data.magicLinks.bounced > 0 ? "text-red-400" : "text-text-primary"}`}>{data.magicLinks.bounced}</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Follow-upy</p>
            <p className="text-xl font-bold text-text-primary">{data.magicLinks.followedUp}</p>
          </div>
        </div>

        {data.magicLinks.unresolved.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-sm font-medium text-amber-400">
                {data.magicLinks.unresolved.length} osób nie kliknęło po follow-upie
              </span>
            </div>
            <div className="space-y-1">
              {data.magicLinks.unresolved.map((u, i) => (
                <p key={i} className="text-xs text-text-secondary">
                  {u.email} ({u.language}, {new Date(u.sentAt).toLocaleString("pl-PL")})
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent lessons */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Ostatnie lekcje
        </h2>
        {data.recentLessons.length === 0 ? (
          <p className="text-text-secondary text-sm">Brak lekcji.</p>
        ) : (
          <div className="space-y-3">
            {data.recentLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-text-primary text-sm font-medium">
                    {lesson.userName}
                  </p>
                  <p className="text-text-secondary text-xs">
                    {lesson.agentName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-text-primary text-sm">
                    {lesson.duration} min
                  </p>
                  <p className="text-text-secondary text-xs">
                    {new Date(lesson.createdAt).toLocaleDateString("pl-PL")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users & Subscriptions */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Użytkownicy i subskrypcje</h2>
        </div>

        {data.userSubscriptions.length === 0 ? (
          <p className="text-text-secondary text-sm">Brak użytkowników.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary text-xs text-left">
                  <th className="pb-2 pr-3 font-medium">Użytkownik</th>
                  <th className="pb-2 pr-3 font-medium">Plan</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Minuty</th>
                  <th className="pb-2 pr-3 font-medium">Stripe</th>
                  <th className="pb-2 font-medium">Okres do</th>
                </tr>
              </thead>
              <tbody>
                {data.userSubscriptions.map((u) => {
                  const totalLimit = u.minutesLimit + u.topupMinutes;
                  const usagePercent = totalLimit > 0
                    ? Math.min(100, Math.round((u.minutesUsed / totalLimit) * 100))
                    : 0;
                  const isAdjusting = adjustingUser === u.userId;

                  return (
                    <tr key={u.userId} className="border-b border-border last:border-0">
                      {/* Name & Email */}
                      <td className="py-3 pr-3">
                        <p className="text-text-primary font-medium">{u.displayName ?? "—"}</p>
                        <p className="text-text-secondary text-xs">{u.email}</p>
                      </td>

                      {/* Tier badge */}
                      <td className="py-3 pr-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TIER_COLORS[u.tierId] ?? TIER_COLORS.free}`}>
                          {TIER_LABELS[u.tierId] ?? u.tierId}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="py-3 pr-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[u.status] ?? STATUS_COLORS.active}`}>
                          {u.status}
                        </span>
                      </td>

                      {/* Minutes with progress bar */}
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="text-text-primary text-xs whitespace-nowrap">
                              {u.minutesUsed} / {totalLimit} min
                              {u.topupMinutes > 0 && (
                                <span className="text-text-secondary"> (+{u.topupMinutes})</span>
                              )}
                            </p>
                            <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1">
                              <div
                                className={`h-full rounded-full transition-all ${usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-green-500"}`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>
                          {/* Adjust button */}
                          {isAdjusting ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                value={adjustMinutes}
                                onChange={(e) => setAdjustMinutes(e.target.value)}
                                placeholder="min"
                                className="w-16 px-1.5 py-0.5 text-xs bg-zinc-800 border border-border rounded text-text-primary focus:outline-none focus:border-primary"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAdjustMinutes(u.userId);
                                  if (e.key === "Escape") { setAdjustingUser(null); setAdjustMinutes(""); }
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => handleAdjustMinutes(u.userId)}
                                disabled={adjustLoading}
                                className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                              >
                                {adjustLoading ? "..." : "OK"}
                              </button>
                              <button
                                onClick={() => { setAdjustingUser(null); setAdjustMinutes(""); }}
                                className="text-xs text-text-secondary hover:text-text-primary"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAdjustingUser(u.userId); setAdjustMinutes(""); }}
                              className="p-0.5 rounded hover:bg-zinc-800 text-text-secondary hover:text-primary transition-colors"
                              title="Dodaj minuty"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Stripe link */}
                      <td className="py-3 pr-3">
                        {u.stripeCustomerId ? (
                          <a
                            href={`${STRIPE_BASE_URL}/customers/${u.stripeCustomerId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors"
                          >
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-text-secondary text-xs">—</span>
                        )}
                      </td>

                      {/* Period end */}
                      <td className="py-3">
                        <span className="text-text-secondary text-xs">
                          {u.currentPeriodEnd
                            ? new Date(u.currentPeriodEnd).toLocaleDateString("pl-PL")
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

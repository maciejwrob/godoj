"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  User,
  CreditCard,
  Clock,
  Trash2,
  Shield,
} from "lucide-react";

interface UserData {
  id: string;
  displayName: string;
  email: string;
  role: string;
  language: string;
  level: string;
  lastActivity: string | null;
  lessonsCount: number;
  active: boolean;
  createdAt: string;
  tierId: string;
  tierName: string;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  minutesUsed: number;
  minutesLimit: number;
  topupMinutes: number;
  totalLessonMinutes: number;
}

type TierFilter = "all" | "free" | "starter" | "pro" | "friends_family";

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

const TIER_FILTER_LABELS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "Wszyscy" },
  { value: "free", label: "Trial" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "friends_family", label: "F&F" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adjustingUser, setAdjustingUser] = useState<string | null>(null);
  const [adjustMinutes, setAdjustMinutes] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePatch = async (
    userId: string,
    updates: Record<string, unknown>
  ) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, updates }),
    });
    fetchUsers();
  };

  const handleDelete = async (userId: string, email: string) => {
    if (
      !confirm(
        `Usunąć konto ${email}? To usunie WSZYSTKIE dane i pozwoli na ponowną rejestrację na ten email.`
      )
    )
      return;
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    setExpandedId(null);
    fetchUsers();
  };

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
        fetchUsers();
      }
    } catch (err) {
      console.error("Adjust minutes error:", err);
    } finally {
      setAdjustLoading(false);
    }
  };

  // Filter by tier group (starter includes starter_yearly, etc.)
  const matchesTierFilter = (tierId: string, filter: TierFilter): boolean => {
    if (filter === "all") return true;
    if (filter === "starter") return tierId === "starter" || tierId === "starter_yearly";
    if (filter === "pro") return tierId === "pro" || tierId === "pro_yearly";
    return tierId === filter;
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesTier = matchesTierFilter(u.tierId, tierFilter);
    return matchesSearch && matchesTier;
  });

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pl-PL");
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Użytkownicy</h1>
        <span className="text-text-secondary text-sm">
          {filtered.length} z {users.length}
        </span>
      </div>

      {/* Search + Tier filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            placeholder="Szukaj po nazwie lub emailu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-bg-card border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-1">
          {TIER_FILTER_LABELS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTierFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                tierFilter === f.value
                  ? "bg-primary text-white"
                  : "bg-bg-card border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* User list */}
      {loading ? (
        <p className="text-text-secondary">Ładowanie...</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => {
            const isExpanded = expandedId === user.id;
            const totalLimit = user.minutesLimit + user.topupMinutes;
            const usagePercent =
              totalLimit > 0
                ? Math.min(100, Math.round((user.minutesUsed / totalLimit) * 100))
                : 0;

            return (
              <div
                key={user.id}
                className="bg-bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Collapsed row */}
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-bg-card-hover transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : user.id)
                  }
                >
                  {/* Name + email */}
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary font-medium truncate">
                      {user.displayName}
                    </p>
                    <p className="text-text-secondary text-xs truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Tier badge */}
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                      TIER_COLORS[user.tierId] ?? TIER_COLORS.free
                    }`}
                  >
                    {TIER_LABELS[user.tierId] ?? user.tierId}
                  </span>

                  {/* Subscription status badge */}
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                      STATUS_COLORS[user.subscriptionStatus] ?? STATUS_COLORS.active
                    }`}
                  >
                    {user.subscriptionStatus}
                  </span>

                  {/* Minutes usage */}
                  <div className="hidden sm:block min-w-[140px]">
                    <p className="text-text-primary text-xs whitespace-nowrap">
                      {user.minutesUsed} / {totalLimit} min
                    </p>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-1">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usagePercent > 90
                            ? "bg-red-500"
                            : usagePercent > 70
                              ? "bg-amber-500"
                              : "bg-green-500"
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Last activity */}
                  <span className="hidden md:block text-text-secondary text-xs whitespace-nowrap min-w-[80px]">
                    {formatDate(user.lastActivity)}
                  </span>

                  {/* Chevron */}
                  <span className="text-text-secondary">
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </span>
                </div>

                {/* Expanded detail card */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Profile section */}
                      <div className="space-y-3">
                        <h3 className="text-text-primary font-semibold text-sm flex items-center gap-2">
                          <User size={14} />
                          Profil
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Nazwa</span>
                            <span className="text-text-primary">
                              {user.displayName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Email</span>
                            <span className="text-text-primary text-right truncate ml-2">
                              {user.email}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Rola</span>
                            <span className="text-text-primary">
                              {user.role}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Język</span>
                            <span className="text-text-primary">
                              {user.language}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Poziom</span>
                            <span className="text-text-primary">
                              {user.level}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">
                              Członek od
                            </span>
                            <span className="text-text-primary">
                              {formatDate(user.createdAt)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">
                              Ostatnia aktywność
                            </span>
                            <span className="text-text-primary">
                              {formatDate(user.lastActivity)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">
                              Lekcje (łącznie)
                            </span>
                            <span className="text-text-primary">
                              {user.lessonsCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Subscription section */}
                      <div className="space-y-3">
                        <h3 className="text-text-primary font-semibold text-sm flex items-center gap-2">
                          <CreditCard size={14} />
                          Subskrypcja
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-text-secondary">Plan</span>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                TIER_COLORS[user.tierId] ?? TIER_COLORS.free
                              }`}
                            >
                              {TIER_LABELS[user.tierId] ?? user.tierId}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-text-secondary">Status</span>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                STATUS_COLORS[user.subscriptionStatus] ??
                                STATUS_COLORS.active
                              }`}
                            >
                              {user.subscriptionStatus}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">
                              Okres do
                            </span>
                            <span className="text-text-primary">
                              {formatDate(user.currentPeriodEnd)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">
                              Anulowanie z końcem okresu
                            </span>
                            <span className="text-text-primary">
                              {user.cancelAtPeriodEnd ? "Tak" : "Nie"}
                            </span>
                          </div>
                          {user.stripeCustomerId && (
                            <div className="flex justify-between items-center">
                              <span className="text-text-secondary">
                                Stripe klient
                              </span>
                              <a
                                href={`${STRIPE_BASE_URL}/customers/${user.stripeCustomerId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-xs flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Otwórz
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          )}
                          {user.stripeSubscriptionId && (
                            <div className="flex justify-between items-center">
                              <span className="text-text-secondary">
                                Stripe subskrypcja
                              </span>
                              <a
                                href={`${STRIPE_BASE_URL}/subscriptions/${user.stripeSubscriptionId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-xs flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Otwórz
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Usage section */}
                      <div className="space-y-3">
                        <h3 className="text-text-primary font-semibold text-sm flex items-center gap-2">
                          <Clock size={14} />
                          Zużycie
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-text-secondary">
                                Minuty w okresie
                              </span>
                              <span className="text-text-primary">
                                {user.minutesUsed} / {totalLimit} min
                              </span>
                            </div>
                            <div className="w-full h-2 bg-zinc-800 rounded-full">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  usagePercent > 90
                                    ? "bg-red-500"
                                    : usagePercent > 70
                                      ? "bg-amber-500"
                                      : "bg-green-500"
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">
                              Doładowania
                            </span>
                            <span className="text-text-primary">
                              {user.topupMinutes > 0
                                ? `${user.topupMinutes} min`
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">
                              Minuty łącznie (all-time)
                            </span>
                            <span className="text-text-primary">
                              {user.totalLessonMinutes} min
                            </span>
                          </div>

                          {/* Add minutes */}
                          <div className="pt-2">
                            {adjustingUser === user.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={adjustMinutes}
                                  onChange={(e) =>
                                    setAdjustMinutes(e.target.value)
                                  }
                                  placeholder="Minuty"
                                  className="w-20 px-2 py-1 text-sm bg-zinc-800 border border-border rounded text-text-primary focus:outline-none focus:border-primary"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleAdjustMinutes(user.id);
                                    if (e.key === "Escape") {
                                      setAdjustingUser(null);
                                      setAdjustMinutes("");
                                    }
                                  }}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAdjustMinutes(user.id);
                                  }}
                                  disabled={adjustLoading}
                                  className="px-2 py-1 rounded text-sm bg-green-900/50 text-green-200 hover:bg-green-900 transition-colors disabled:opacity-50"
                                >
                                  {adjustLoading ? "..." : "OK"}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAdjustingUser(null);
                                    setAdjustMinutes("");
                                  }}
                                  className="text-text-secondary hover:text-text-primary text-sm"
                                >
                                  Anuluj
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAdjustingUser(user.id);
                                  setAdjustMinutes("");
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-bg-card-hover text-text-secondary hover:text-text-primary border border-border hover:border-primary transition-colors"
                              >
                                <Plus size={14} />
                                Dodaj minuty
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-border">
                      {/* Toggle active */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePatch(user.id, {
                            is_active: !user.active,
                          });
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                          user.active
                            ? "bg-bg-card-hover text-text-primary border-border hover:border-red-500/50"
                            : "bg-green-900/20 text-green-200 border-green-500/30 hover:bg-green-900/40"
                        }`}
                      >
                        <Shield size={14} />
                        {user.active ? "Dezaktywuj" : "Aktywuj"}
                      </button>

                      {/* Role selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary text-sm">
                          Rola:
                        </span>
                        <select
                          value={user.role}
                          onChange={(e) => {
                            e.stopPropagation();
                            handlePatch(user.id, { role: e.target.value });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-lg text-sm bg-bg-card-hover text-text-primary border border-border focus:outline-none focus:border-primary"
                        >
                          <option value="admin">admin</option>
                          <option value="adult">adult</option>
                          <option value="child">child</option>
                        </select>
                      </div>

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(user.id, user.email);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 size={14} />
                        Usuń konto
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-text-secondary text-sm text-center py-8">
              Brak wyników.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

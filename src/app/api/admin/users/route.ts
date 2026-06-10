import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [
    { data: users, error },
    { data: authData },
    { data: lessons },
    { data: allSubscriptions },
    { data: allUsage },
    { data: allTopups },
    { data: allTiers },
  ] = await Promise.all([
    // Users with profiles and stripe_customer_id
    supabase
      .from("users")
      .select("id, display_name, role, is_active, created_at, stripe_customer_id, user_profiles(target_language, current_level)")
      .order("created_at", { ascending: false }),
    // Auth users for emails
    supabase.auth.admin.listUsers({ perPage: 100 }),
    // All completed lessons (for stats + total minutes)
    supabase.from("lessons").select("user_id, started_at, duration_seconds").not("ended_at", "is", null),
    // Subscriptions (most recent first)
    supabase.from("subscriptions").select("user_id, tier_id, status, stripe_subscription_id, current_period_end, cancel_at_period_end").order("created_at", { ascending: false }),
    // Usage records (most recent first)
    supabase.from("subscription_usage").select("user_id, minutes_used, period_start").order("period_start", { ascending: false }),
    // Active topups
    supabase.from("subscription_topups").select("user_id, minutes_remaining").gt("minutes_remaining", 0),
    // Tier definitions
    supabase.from("subscription_tiers").select("id, name_pl, monthly_minutes"),
  ]);

  if (error) return NextResponse.json([], { status: 200 });

  // Email lookup from auth
  const emailMap = new Map<string, string>();
  for (const u of authData?.users ?? []) {
    emailMap.set(u.id, u.email ?? "");
  }

  // Lesson stats: count, last activity, total minutes
  const statsMap = new Map<string, { count: number; lastAt: string | null; totalMinutes: number }>();
  for (const l of lessons ?? []) {
    const ex = statsMap.get(l.user_id);
    const mins = (l.duration_seconds ?? 0) / 60;
    if (!ex) {
      statsMap.set(l.user_id, { count: 1, lastAt: l.started_at, totalMinutes: mins });
    } else {
      ex.count++;
      ex.totalMinutes += mins;
      if (l.started_at > (ex.lastAt ?? "")) ex.lastAt = l.started_at;
    }
  }

  // Tier limits: id -> monthly_minutes
  const tierLimitsMap = new Map<string, number>();
  const tierNamesMap = new Map<string, string>();
  for (const t of allTiers ?? []) {
    tierLimitsMap.set(t.id, t.monthly_minutes);
    tierNamesMap.set(t.id, t.name_pl);
  }

  // Most recent subscription per user
  const subMap = new Map<string, { tier_id: string; status: string; stripe_subscription_id: string | null; current_period_end: string | null; cancel_at_period_end: boolean }>();
  for (const s of allSubscriptions ?? []) {
    if (!subMap.has(s.user_id)) subMap.set(s.user_id, s);
  }

  // Most recent usage per user
  const usageMap = new Map<string, number>();
  for (const u of allUsage ?? []) {
    if (!usageMap.has(u.user_id)) usageMap.set(u.user_id, Number(u.minutes_used));
  }

  // Sum topup minutes per user
  const topupMap = new Map<string, number>();
  for (const t of allTopups ?? []) {
    topupMap.set(t.user_id, (topupMap.get(t.user_id) ?? 0) + Number(t.minutes_remaining));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (users ?? []).map((u: any) => {
    const profiles = Array.isArray(u.user_profiles) ? u.user_profiles : [];
    const langs = profiles.map((p: { target_language: string }) => p.target_language).join(", ");
    const level = profiles[0]?.current_level ?? "-";
    const stats = statsMap.get(u.id);
    const sub = subMap.get(u.id);
    const tierId = sub?.tier_id ?? "free";

    return {
      id: u.id,
      displayName: u.display_name ?? "?",
      email: emailMap.get(u.id) ?? "?",
      role: u.role,
      language: langs || "-",
      level,
      lastActivity: stats?.lastAt ?? null,
      lessonsCount: stats?.count ?? 0,
      active: u.is_active ?? true,
      createdAt: u.created_at,
      // Subscription data
      tierId,
      tierName: tierNamesMap.get(tierId) ?? "Trial",
      subscriptionStatus: sub?.status ?? "active",
      stripeCustomerId: u.stripe_customer_id ?? null,
      stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
      minutesUsed: Math.round((usageMap.get(u.id) ?? 0) * 10) / 10,
      minutesLimit: tierLimitsMap.get(tierId) ?? 30,
      topupMinutes: Math.round((topupMap.get(u.id) ?? 0) * 10) / 10,
      totalLessonMinutes: Math.round((stats?.totalMinutes ?? 0) * 10) / 10,
    };
  });

  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user_id, updates } = await request.json();
  if (!user_id || !updates) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const allowed = ["role", "is_active", "onboarding_complete"];
  const sanitized: Record<string, unknown> = {};
  for (const k of allowed) { if (k in updates) sanitized[k] = updates[k]; }

  // Service-role client: column-level grants block role/is_active via user client
  const { error } = await createAdminClient().from("users").update(sanitized).eq("id", user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user_id } = await request.json();
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const admin = createAdminClient();

  // Delete all user data (cascade-safe order)
  const tables = [
    "error_logs",
    "user_achievements",
    "exercise_sessions",
    "feedback",
    "vocabulary",
    "lessons",
    "streaks",
    "subscription_topups",
    "subscription_usage",
    "subscriptions",
    "user_profiles",
    "users",
  ];

  for (const table of tables) {
    await admin.from(table).delete().eq("user_id", user_id);
  }

  // Delete from auth.users (completely removes the account)
  const { error } = await admin.auth.admin.deleteUser(user_id);
  if (error) {
    console.error("Auth delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

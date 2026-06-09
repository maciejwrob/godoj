import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const betaLimit = parseInt(process.env.BETA_USER_LIMIT ?? "30", 10);

  const [
    { count: activeUsers7d },
    { count: lessonsThisMonth },
    { data: minutesData },
    { data: recentLessonsRaw },
    { count: totalRegistered },
    { count: waitlistCount, data: waitlistEntries },
    { data: magicLinkStats },
    { data: perUserUsage },
    { data: unresolvedLinks },
    { data: allUsers },
    { data: allSubscriptions },
    { data: allUsage },
    { data: allTopups },
    { data: allTiers },
  ] = await Promise.all([
    supabase.from("lessons").select("user_id", { count: "exact", head: true }).gte("started_at", sevenDaysAgo),
    supabase.from("lessons").select("*", { count: "exact", head: true }).gte("started_at", monthStart),
    supabase.from("lessons").select("duration_seconds").gte("started_at", monthStart),
    supabase.from("lessons").select("id, started_at, duration_seconds, language, user_id, users(display_name)").order("started_at", { ascending: false }).limit(5),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("onboarding_complete", true),
    supabase.from("waitlist").select("id, email, locale, created_at", { count: "exact" }).is("converted_at", null).order("created_at", { ascending: false }),
    supabase.from("magic_link_events").select("*").gte("sent_at", twentyFourHoursAgo),
    supabase.from("lessons").select("user_id, duration_seconds, users(display_name, email)").gte("started_at", monthStart),
    supabase.from("magic_link_events").select("email, ui_language, sent_at")
      .is("clicked_at", null).not("follow_up_sent_at", "is", null)
      .gte("sent_at", twentyFourHoursAgo),
    // Users & subscriptions data
    supabase.from("users").select("id, display_name, email, stripe_customer_id"),
    supabase.from("subscriptions").select("user_id, tier_id, status, stripe_subscription_id, current_period_end, cancel_at_period_end").order("created_at", { ascending: false }),
    supabase.from("subscription_usage").select("user_id, minutes_used, period_start").order("period_start", { ascending: false }),
    supabase.from("subscription_topups").select("user_id, minutes_remaining").gt("minutes_remaining", 0),
    supabase.from("subscription_tiers").select("id, name_pl, monthly_minutes"),
  ]);

  const minutesThisMonth = Math.round(
    (minutesData ?? []).reduce((sum, l) => sum + (l.duration_seconds ?? 0), 0) / 60
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentLessons = (recentLessonsRaw ?? []).map((l: any) => {
    const user = Array.isArray(l.users) ? l.users[0] : l.users;
    return {
      id: l.id,
      userName: user?.display_name ?? "Nieznany",
      agentName: l.language ?? "—",
      duration: l.duration_seconds ? Math.round(l.duration_seconds / 60) : 0,
      createdAt: l.started_at,
    };
  });

  // Magic link stats (24h)
  const mlEvents = magicLinkStats ?? [];
  const mlSent = mlEvents.length;
  const mlDelivered = mlEvents.filter(e => e.delivered_at).length;
  const mlClicked = mlEvents.filter(e => e.clicked_at).length;
  const mlBounced = mlEvents.filter(e => e.bounced_at).length;
  const mlFollowedUp = mlEvents.filter(e => e.follow_up_sent_at).length;

  // Per-user usage this month
  const userMap = new Map<string, { name: string; email: string; minutes: number; lessons: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of perUserUsage ?? [] as any[]) {
    const uid = row.user_id;
    const user = Array.isArray(row.users) ? row.users[0] : row.users;
    const name = user?.display_name ?? "Unknown";
    const email = user?.email ?? "";
    const existing = userMap.get(uid) ?? { name, email, minutes: 0, lessons: 0 };
    existing.minutes += Math.round((row.duration_seconds ?? 0) / 60);
    existing.lessons += 1;
    userMap.set(uid, existing);
  }
  const topUser = [...userMap.entries()].sort((a, b) => b[1].minutes - a[1].minutes)[0];
  const avgPerUser = userMap.size > 0 ? Math.round(minutesThisMonth / userMap.size) : 0;

  // Build per-user subscription data
  const tierLimitsMap = new Map<string, number>();
  for (const t of allTiers ?? []) {
    tierLimitsMap.set(t.id, t.monthly_minutes);
  }

  // Map: user_id -> most recent subscription
  const subMap = new Map<string, typeof allSubscriptions extends (infer T)[] | null ? T : never>();
  for (const s of allSubscriptions ?? []) {
    // Keep only the first (most recent) subscription per user
    if (!subMap.has(s.user_id)) {
      subMap.set(s.user_id, s);
    }
  }

  // Map: user_id -> most recent usage record's minutes_used
  const usageMap = new Map<string, number>();
  for (const u of allUsage ?? []) {
    if (!usageMap.has(u.user_id)) {
      usageMap.set(u.user_id, Number(u.minutes_used));
    }
  }

  // Map: user_id -> sum of topup minutes_remaining
  const topupMap = new Map<string, number>();
  for (const t of allTopups ?? []) {
    topupMap.set(t.user_id, (topupMap.get(t.user_id) ?? 0) + Number(t.minutes_remaining));
  }

  const userSubscriptions = (allUsers ?? []).map((u) => {
    const sub = subMap.get(u.id);
    const tierId = sub?.tier_id ?? "free";
    return {
      userId: u.id,
      displayName: u.display_name,
      email: u.email,
      tierId,
      status: sub?.status ?? "active",
      stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
      stripeCustomerId: u.stripe_customer_id ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      minutesUsed: Math.round((usageMap.get(u.id) ?? 0) * 10) / 10,
      minutesLimit: tierLimitsMap.get(tierId) ?? 30,
      topupMinutes: Math.round((topupMap.get(u.id) ?? 0) * 10) / 10,
    };
  });

  return NextResponse.json({
    activeUsers: activeUsers7d ?? 0,
    lessonsThisMonth: lessonsThisMonth ?? 0,
    minutesThisMonth,
    recentLessons,
    // Beta status
    beta: {
      registered: totalRegistered ?? 0,
      limit: betaLimit,
      waitlist: waitlistCount ?? 0,
      waitlistEntries: (waitlistEntries ?? []).map(w => ({
        id: w.id,
        email: w.email,
        locale: w.locale,
        createdAt: w.created_at,
      })),
      avgPerUser,
      topUser: topUser ? { name: topUser[1].name, email: topUser[1].email, minutes: topUser[1].minutes } : null,
    },
    // Magic link stats (24h)
    magicLinks: {
      sent: mlSent,
      delivered: mlDelivered,
      clicked: mlClicked,
      bounced: mlBounced,
      followedUp: mlFollowedUp,
      unresolved: (unresolvedLinks ?? []).map(l => ({
        email: l.email,
        language: l.ui_language,
        sentAt: l.sent_at,
      })),
    },
    // Users & subscriptions
    userSubscriptions,
  });
}

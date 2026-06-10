import { createAdminClient } from "@/lib/supabase/admin";

// Fallback tier config if DB is unavailable
const TIER_LIMITS: Record<string, number> = {
  free: 30, // Trial: 30 min one-time
  starter: 90,
  starter_yearly: 90,
  pro: 250,
  pro_yearly: 250,
};

export interface UserSubscription {
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
  /** Free tier only: when the 14-day trial ends (ISO) and whether it's over */
  trialEndsAt: string | null;
  trialExpired: boolean;
  trialExtensionUsed: boolean;
}

const TRIAL_DAYS = 14;
const TRIAL_EXTENSION_DAYS = 7;
export { TRIAL_EXTENSION_DAYS };

export interface LessonCheckResult {
  allowed: boolean;
  reason?: string;
  code?: "TRIAL_EXPIRED" | "MINUTES_EXHAUSTED";
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  tier: string;
  isUnlimited: boolean;
  upgrade?: boolean;
}

/**
 * Check if a user email is in the Friends & Family unlimited list.
 */
function isFriendsAndFamily(email: string | undefined): boolean {
  if (!email) return false;
  const unlimitedEmails = (process.env.UNLIMITED_USERS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return unlimitedEmails.includes(email.toLowerCase());
}

/**
 * Get the current billing period for a user.
 * For paid users: uses subscription period.
 * For free users: rolling 30-day window from period_start.
 */
async function getCurrentUsage(
  userId: string
): Promise<{ minutesUsed: number; periodStart: string; periodEnd: string }> {
  const db = createAdminClient();

  // Get the most recent usage record for this user
  const { data: usage } = await db
    .from("subscription_usage")
    .select("minutes_used, period_start, period_end")
    .eq("user_id", userId)
    .order("period_start", { ascending: false })
    .limit(1)
    .single();

  if (usage) {
    return {
      minutesUsed: Number(usage.minutes_used),
      periodStart: usage.period_start,
      periodEnd: usage.period_end,
    };
  }

  // No usage record — start fresh
  const now = new Date();
  return {
    minutesUsed: 0,
    periodStart: now.toISOString().split("T")[0],
    periodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  };
}

/**
 * Get total remaining top-up minutes for a user.
 */
async function getTopupMinutes(userId: string): Promise<number> {
  const db = createAdminClient();
  const { data: topups } = await db
    .from("subscription_topups")
    .select("minutes_remaining")
    .eq("user_id", userId)
    .gt("minutes_remaining", 0);

  if (!topups || topups.length === 0) return 0;
  return topups.reduce((sum, t) => sum + Number(t.minutes_remaining), 0);
}

/**
 * Get the user's current subscription and usage info.
 */
export async function getUserSubscription(
  userId: string,
  userEmail?: string
): Promise<UserSubscription> {
  // Friends & Family override
  if (isFriendsAndFamily(userEmail)) {
    return {
      tier: "friends_family",
      tierNamePl: "Friends & Family",
      minutesUsed: 0,
      minutesLimit: Infinity,
      minutesRemaining: Infinity,
      isUnlimited: true,
      status: "active",
      periodEnd: null,
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
      trialEndsAt: null,
      trialExpired: false,
      trialExtensionUsed: false,
    };
  }

  const db = createAdminClient();

  // Get active subscription + usage + top-ups in parallel (independent queries)
  const [{ data: sub }, { minutesUsed }, topupMinutes] = await Promise.all([
    db
      .from("subscriptions")
      .select(
        "tier_id, status, current_period_end, cancel_at_period_end, stripe_subscription_id"
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    getCurrentUsage(userId),
    getTopupMinutes(userId),
  ]);

  const tier = sub?.tier_id ?? "free";
  const planMinutes = TIER_LIMITS[tier] ?? TIER_LIMITS.free;

  // Total available = plan minutes + top-up minutes
  let minutesLimit = planMinutes + topupMinutes;

  // Trial expiry: free tier is valid 14 days from trial_started_at (+ extension)
  let trialEndsAt: string | null = null;
  let trialExpired = false;
  let trialExtensionUsed = false;
  if (tier === "free") {
    const { data: userRow } = await db
      .from("users")
      .select("trial_started_at, trial_extension_days, created_at")
      .eq("id", userId)
      .single();
    const startedAt = userRow?.trial_started_at ?? userRow?.created_at ?? new Date().toISOString();
    const extensionDays = Number(userRow?.trial_extension_days ?? 0);
    trialExtensionUsed = extensionDays > 0;
    const endMs = new Date(startedAt).getTime() + (TRIAL_DAYS + extensionDays) * 86400000;
    trialEndsAt = new Date(endMs).toISOString();
    trialExpired = Date.now() > endMs;
    if (trialExpired) minutesLimit = 0; // trial over — no free minutes left (top-ups don't apply to free tier)
  }

  // Get tier display name
  const { data: tierData } = await db
    .from("subscription_tiers")
    .select("name_pl")
    .eq("id", tier)
    .single();

  return {
    tier,
    tierNamePl: tierData?.name_pl ?? "Darmowy",
    minutesUsed: Math.round(minutesUsed * 10) / 10,
    minutesLimit,
    minutesRemaining: Math.max(0, minutesLimit - minutesUsed),
    isUnlimited: false,
    status: sub?.status ?? "active",
    periodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
    stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
    trialEndsAt,
    trialExpired,
    trialExtensionUsed,
  };
}

/**
 * Check if a user can start a new lesson.
 */
export async function checkCanStartLesson(
  userId: string,
  userEmail?: string
): Promise<LessonCheckResult> {
  const subscription = await getUserSubscription(userId, userEmail);

  if (subscription.isUnlimited) {
    return {
      allowed: true,
      minutesUsed: 0,
      minutesLimit: Infinity,
      minutesRemaining: Infinity,
      tier: subscription.tier,
      isUnlimited: true,
    };
  }

  const allowed = subscription.minutesRemaining > 0 && !subscription.trialExpired;
  const isTrial = subscription.tier === "free";

  return {
    allowed,
    code: allowed
      ? undefined
      : subscription.trialExpired
        ? "TRIAL_EXPIRED"
        : "MINUTES_EXHAUSTED",
    reason: allowed
      ? undefined
      : isTrial
        ? "Twój okres próbny się skończył. Wybierz plan, żeby kontynuować naukę."
        : "Wykorzystano limit minut. Przejdź na wyższy plan, żeby kontynuować naukę.",
    minutesUsed: subscription.minutesUsed,
    minutesLimit: subscription.minutesLimit,
    minutesRemaining: subscription.minutesRemaining,
    tier: subscription.tier,
    isUnlimited: false,
    upgrade: !allowed ? true : undefined,
  };
}

/**
 * Record usage after a lesson ends.
 * Upserts into subscription_usage for the current billing period.
 * When plan minutes are exhausted, consumes from top-up balance (FIFO).
 */
export async function recordUsage(
  userId: string,
  durationSeconds: number
): Promise<void> {
  const db = createAdminClient();
  const minutes = durationSeconds / 60;

  // Get or determine current period
  const { periodStart, periodEnd, minutesUsed: currentUsed } =
    await getCurrentUsage(userId);

  // Get active subscription to check plan limit
  const { data: sub } = await db
    .from("subscriptions")
    .select("tier_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const tier = sub?.tier_id ?? "free";
  const planLimit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;

  // Calculate how many minutes go over the plan limit
  const newTotal = currentUsed + minutes;
  const overPlan = Math.max(0, newTotal - planLimit);
  const wasAlreadyOver = Math.max(0, currentUsed - planLimit);
  const topupToConsume = Math.max(0, overPlan - wasAlreadyOver);

  // Consume from top-up balance (FIFO — oldest first)
  if (topupToConsume > 0) {
    const { data: topups } = await db
      .from("subscription_topups")
      .select("id, minutes_remaining")
      .eq("user_id", userId)
      .gt("minutes_remaining", 0)
      .order("purchased_at", { ascending: true });

    let remaining = topupToConsume;
    for (const topup of topups ?? []) {
      if (remaining <= 0) break;
      const consume = Math.min(remaining, Number(topup.minutes_remaining));
      await db
        .from("subscription_topups")
        .update({ minutes_remaining: Number(topup.minutes_remaining) - consume })
        .eq("id", topup.id);
      remaining -= consume;
    }
  }

  // Upsert usage — add minutes to existing record or create new one
  const { data: existing } = await db
    .from("subscription_usage")
    .select("id, minutes_used")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .single();

  if (existing) {
    await db
      .from("subscription_usage")
      .update({
        minutes_used: Number(existing.minutes_used) + minutes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await db.from("subscription_usage").insert({
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
      minutes_used: minutes,
    });
  }
}

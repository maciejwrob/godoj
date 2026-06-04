import { createAdminClient } from "@/lib/supabase/admin";

// Fallback tier config if DB is unavailable
const TIER_LIMITS: Record<string, number> = {
  free: 15,
  starter: 80,
  starter_yearly: 80,
  pro: 150,
  pro_yearly: 150,
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
}

export interface LessonCheckResult {
  allowed: boolean;
  reason?: string;
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
    const now = new Date();
    const periodEnd = new Date(usage.period_end);

    // If current period has expired, return 0 usage (new period)
    if (now > periodEnd) {
      return {
        minutesUsed: 0,
        periodStart: now.toISOString().split("T")[0],
        periodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      };
    }

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
    };
  }

  const db = createAdminClient();

  // Get active subscription
  const { data: sub } = await db
    .from("subscriptions")
    .select(
      "tier_id, status, current_period_end, cancel_at_period_end, stripe_subscription_id"
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const tier = sub?.tier_id ?? "free";
  const minutesLimit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;

  // Get usage for current period
  const { minutesUsed } = await getCurrentUsage(userId);

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

  const allowed = subscription.minutesRemaining > 0;

  return {
    allowed,
    reason: allowed
      ? undefined
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
 */
export async function recordUsage(
  userId: string,
  durationSeconds: number
): Promise<void> {
  const db = createAdminClient();
  const minutes = durationSeconds / 60;

  // Get or determine current period
  const { periodStart, periodEnd } = await getCurrentUsage(userId);

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

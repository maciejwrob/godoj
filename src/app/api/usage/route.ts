import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserSubscription } from "@/lib/subscription";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subscription = await getUserSubscription(user.id, user.email ?? undefined);

    return NextResponse.json({
      minutesUsed: subscription.minutesUsed,
      minutesLimit: subscription.minutesLimit,
      minutesRemaining: subscription.minutesRemaining,
      unlimited: subscription.isUnlimited,
      tier: subscription.tier,
      tierNamePl: subscription.tierNamePl,
      periodEnd: subscription.periodEnd,
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

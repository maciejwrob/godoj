import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const unlimitedEmails = (process.env.UNLIMITED_USERS ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    const isUnlimited = unlimitedEmails.includes(user.email?.toLowerCase() ?? "");
    const dailyLimitMin = parseInt(process.env.DAILY_MINUTES_PER_USER ?? "10", 10);
    const monthlyLimitMin = parseInt(process.env.MONTHLY_MINUTES_PER_USER ?? "100", 10);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const mStart = new Date();
    mStart.setDate(1);
    mStart.setHours(0, 0, 0, 0);

    const [{ data: todayUsage }, { data: monthUsage }] = await Promise.all([
      supabase.from("lessons").select("duration_seconds").eq("user_id", user.id).gte("started_at", todayStart.toISOString()),
      supabase.from("lessons").select("duration_seconds").eq("user_id", user.id).gte("started_at", mStart.toISOString()),
    ]);

    const todayMinutes = Math.round((todayUsage ?? []).reduce((s, l) => s + (l.duration_seconds ?? 0), 0) / 60);
    const monthMinutes = Math.round((monthUsage ?? []).reduce((s, l) => s + (l.duration_seconds ?? 0), 0) / 60);

    return NextResponse.json({
      todayMinutes,
      dailyLimit: dailyLimitMin,
      monthMinutes,
      monthlyLimit: monthlyLimitMin,
      unlimited: isUnlimited,
      tier: isUnlimited ? "friends_family" : "beta",
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

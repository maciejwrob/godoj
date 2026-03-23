import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Active users in last 7 days (distinct user_ids with a lesson)
  const { count: activeUsers7d } = await supabase
    .from("lessons")
    .select("user_id", { count: "exact", head: true })
    .gte("started_at", sevenDaysAgo);

  // Lessons this month
  const { count: lessonsThisMonth } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .gte("started_at", monthStart);

  // Total minutes this month
  const { data: minutesData } = await supabase
    .from("lessons")
    .select("duration_seconds")
    .gte("started_at", monthStart);

  const minutesThisMonth = Math.round(
    (minutesData ?? []).reduce((sum, l) => sum + (l.duration_seconds ?? 0), 0) / 60
  );

  // Recent 5 lessons with user display_name
  const { data: recentLessons } = await supabase
    .from("lessons")
    .select("id, started_at, duration_seconds, language, user_id, users(display_name)")
    .order("started_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    active_users_7d: activeUsers7d ?? 0,
    lessons_this_month: lessonsThisMonth ?? 0,
    minutes_this_month: minutesThisMonth,
    recent_lessons: recentLessons ?? [],
  });
}

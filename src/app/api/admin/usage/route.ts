import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Daily usage from usage_daily table
  const { data: dailyUsage, error: dailyError } = await supabase
    .from("usage_daily")
    .select("*")
    .gte("date", thirtyDaysAgo.split("T")[0])
    .order("date", { ascending: true });

  if (dailyError) {
    return NextResponse.json({ error: dailyError.message }, { status: 500 });
  }

  // Per-user breakdown from lessons grouped by user_id
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("user_id, duration_seconds, users(display_name)")
    .gte("started_at", thirtyDaysAgo);

  if (lessonsError) {
    return NextResponse.json({ error: lessonsError.message }, { status: 500 });
  }

  // Group lessons by user
  const userMap = new Map<string, {
    user_id: string;
    display_name: string | null;
    lessons_count: number;
    total_seconds: number;
  }>();

  for (const lesson of lessons ?? []) {
    const existing = userMap.get(lesson.user_id);
    const users = lesson.users as unknown as { display_name: string } | null;
    const displayName = users?.display_name ?? null;
    if (!existing) {
      userMap.set(lesson.user_id, {
        user_id: lesson.user_id,
        display_name: displayName,
        lessons_count: 1,
        total_seconds: lesson.duration_seconds ?? 0,
      });
    } else {
      existing.lessons_count += 1;
      existing.total_seconds += lesson.duration_seconds ?? 0;
    }
  }

  return NextResponse.json({
    daily_usage: dailyUsage ?? [],
    per_user: Array.from(userMap.values()),
  });
}

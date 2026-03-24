import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ count: activeUsers7d }, { count: lessonsThisMonth }, { data: minutesData }, { data: recentLessonsRaw }] =
    await Promise.all([
      supabase.from("lessons").select("user_id", { count: "exact", head: true }).gte("started_at", sevenDaysAgo),
      supabase.from("lessons").select("*", { count: "exact", head: true }).gte("started_at", monthStart),
      supabase.from("lessons").select("duration_seconds").gte("started_at", monthStart),
      supabase.from("lessons").select("id, started_at, duration_seconds, language, user_id, users(display_name)").order("started_at", { ascending: false }).limit(5),
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

  return NextResponse.json({
    activeUsers: activeUsers7d ?? 0,
    lessonsThisMonth: lessonsThisMonth ?? 0,
    minutesThisMonth,
    recentLessons,
  });
}

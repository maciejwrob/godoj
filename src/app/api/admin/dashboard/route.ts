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
    { count: waitlistCount },
    { data: magicLinkStats },
    { data: perUserUsage },
    { data: unresolvedLinks },
  ] = await Promise.all([
    supabase.from("lessons").select("user_id", { count: "exact", head: true }).gte("started_at", sevenDaysAgo),
    supabase.from("lessons").select("*", { count: "exact", head: true }).gte("started_at", monthStart),
    supabase.from("lessons").select("duration_seconds").gte("started_at", monthStart),
    supabase.from("lessons").select("id, started_at, duration_seconds, language, user_id, users(display_name)").order("started_at", { ascending: false }).limit(5),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("onboarding_complete", true),
    supabase.from("waitlist").select("*", { count: "exact", head: true }).is("converted_at", null),
    supabase.from("magic_link_events").select("*").gte("sent_at", twentyFourHoursAgo),
    supabase.from("lessons").select("user_id, duration_seconds, users(display_name, email)").gte("started_at", monthStart),
    supabase.from("magic_link_events").select("email, ui_language, sent_at")
      .is("clicked_at", null).not("follow_up_sent_at", "is", null)
      .gte("sent_at", twentyFourHoursAgo),
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
  });
}

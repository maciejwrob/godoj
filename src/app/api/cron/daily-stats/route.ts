import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Gather all stats
  const [
    { count: totalUsers },
    { data: todayLessons },
    { data: monthLessons },
    { data: activeUsersData },
    { data: perUserUsage },
    { count: waitlistCount },
    { data: languageBreakdown },
  ] = await Promise.all([
    db.from("users").select("*", { count: "exact", head: true }).eq("onboarding_complete", true),
    db.from("lessons").select("duration_seconds").gte("started_at", todayStart),
    db.from("lessons").select("duration_seconds").gte("started_at", monthStart),
    db.from("lessons").select("user_id").gte("started_at", sevenDaysAgo),
    db.from("lessons").select("user_id, duration_seconds, users(display_name)").gte("started_at", monthStart),
    db.from("waitlist").select("*", { count: "exact", head: true }).is("converted_at", null),
    db.from("lessons").select("language").gte("started_at", monthStart),
  ]);

  const todayMinutes = Math.round((todayLessons ?? []).reduce((s, l) => s + (l.duration_seconds ?? 0), 0) / 60);
  const monthMinutes = Math.round((monthLessons ?? []).reduce((s, l) => s + (l.duration_seconds ?? 0), 0) / 60);
  const todayLessonCount = todayLessons?.length ?? 0;
  const monthLessonCount = monthLessons?.length ?? 0;

  // Active users (unique in last 7 days)
  const activeUserIds = new Set((activeUsersData ?? []).map(l => l.user_id));
  const activeCount = activeUserIds.size;

  // Per-user breakdown
  const userMap = new Map<string, { name: string; minutes: number; lessons: number }>();
  for (const row of perUserUsage ?? []) {
    const uid = row.user_id;
    const user = Array.isArray(row.users) ? row.users[0] : row.users;
    const name = (user as { display_name?: string })?.display_name ?? "Unknown";
    const existing = userMap.get(uid) ?? { name, minutes: 0, lessons: 0 };
    existing.minutes += Math.round((row.duration_seconds ?? 0) / 60);
    existing.lessons += 1;
    userMap.set(uid, existing);
  }
  const topUsers = [...userMap.entries()]
    .sort((a, b) => b[1].minutes - a[1].minutes)
    .slice(0, 10);

  // Language breakdown
  const langCount = new Map<string, number>();
  for (const l of languageBreakdown ?? []) {
    langCount.set(l.language, (langCount.get(l.language) ?? 0) + 1);
  }
  const langStats = [...langCount.entries()].sort((a, b) => b[1] - a[1]);

  const betaLimit = parseInt(process.env.BETA_USER_LIMIT ?? "30", 10);
  const dateStr = now.toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" });

  const html = `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #e2e8f0; background: #0f172a; padding: 32px; border-radius: 16px;">
  <h1 style="color: #fff; font-size: 20px;">🎙️ Godoj Daily Stats — ${dateStr}</h1>

  <h2 style="color: #94a3b8; font-size: 14px; margin-top: 24px;">📊 PODSUMOWANIE</h2>
  <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
    <tr><td style="padding: 6px 0; color: #94a3b8;">Zarejestrowani</td><td style="text-align: right; font-weight: bold; color: #fff;">${totalUsers ?? 0} / ${betaLimit}</td></tr>
    <tr><td style="padding: 6px 0; color: #94a3b8;">Waitlist</td><td style="text-align: right; font-weight: bold; color: #fff;">${waitlistCount ?? 0}</td></tr>
    <tr><td style="padding: 6px 0; color: #94a3b8;">Aktywni (7d)</td><td style="text-align: right; font-weight: bold; color: #fff;">${activeCount}</td></tr>
  </table>

  <h2 style="color: #94a3b8; font-size: 14px; margin-top: 24px;">📅 DZISIAJ</h2>
  <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
    <tr><td style="padding: 6px 0; color: #94a3b8;">Lekcje</td><td style="text-align: right; font-weight: bold; color: #fff;">${todayLessonCount}</td></tr>
    <tr><td style="padding: 6px 0; color: #94a3b8;">Minuty</td><td style="text-align: right; font-weight: bold; color: #fff;">${todayMinutes} min</td></tr>
  </table>

  <h2 style="color: #94a3b8; font-size: 14px; margin-top: 24px;">📆 TEN MIESIĄC</h2>
  <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
    <tr><td style="padding: 6px 0; color: #94a3b8;">Lekcje</td><td style="text-align: right; font-weight: bold; color: #fff;">${monthLessonCount}</td></tr>
    <tr><td style="padding: 6px 0; color: #94a3b8;">Minuty</td><td style="text-align: right; font-weight: bold; color: #fff;">${monthMinutes} min</td></tr>
    <tr><td style="padding: 6px 0; color: #94a3b8;">Śr. na usera</td><td style="text-align: right; font-weight: bold; color: #fff;">${activeCount > 0 ? Math.round(monthMinutes / activeCount) : 0} min</td></tr>
  </table>

  <h2 style="color: #94a3b8; font-size: 14px; margin-top: 24px;">🏆 TOP USERZY (miesiąc)</h2>
  <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
    ${topUsers.map(([, u], i) => `<tr><td style="padding: 4px 0; color: #94a3b8;">${i + 1}. ${u.name}</td><td style="text-align: right; color: #fff;">${u.minutes} min (${u.lessons} lekcji)</td></tr>`).join("")}
  </table>

  <h2 style="color: #94a3b8; font-size: 14px; margin-top: 24px;">🌍 JĘZYKI (miesiąc)</h2>
  <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
    ${langStats.map(([lang, count]) => `<tr><td style="padding: 4px 0; color: #94a3b8;">${lang}</td><td style="text-align: right; color: #fff;">${count} lekcji</td></tr>`).join("")}
  </table>

  <p style="color: #475569; font-size: 11px; margin-top: 32px; text-align: center;">Godoj.co — automated daily report</p>
</div>`;

  try {
    await resend.emails.send({
      from: "Godoj Stats <maciej@godoj.co>",
      to: "maciej@godoj.co",
      subject: `📊 Godoj Daily — ${todayLessonCount} lekcji, ${todayMinutes} min, ${activeCount} aktywnych`,
      html,
    });
  } catch (err) {
    console.error("[cron/daily-stats] Failed to send:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}

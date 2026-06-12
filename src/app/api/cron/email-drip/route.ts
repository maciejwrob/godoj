import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { buildDripEmail, type DripKey } from "@/lib/drip-content";

export const maxDuration = 120;

const TRIAL_DAYS = 14;
const DAY_MS = 86400000;

// Priority: at most ONE email per user per run (cron runs daily)
const PRIORITY: DripKey[] = [
  "trial_expired",
  "trial_1day",
  "trial_3days",
  "congrats_first_lesson",
  "inactive_3d",
  "nudge_day7",
  "nudge_day3",
  "nudge_day1",
];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.godoj.co";
  const now = Date.now();

  // Friends & Family — never receive sales/drip emails
  const ffEmails = new Set(
    (process.env.UNLIMITED_USERS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  );

  // 1) All onboarded users + their auth emails
  const [{ data: users }, authList] = await Promise.all([
    db
      .from("users")
      .select("id, display_name, native_language, ui_language, trial_started_at, trial_extension_days, trial_extension_token, created_at")
      .eq("onboarding_complete", true)
      .eq("is_active", true)
      .neq("role", "child"),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const emailById = new Map<string, string>();
  for (const u of authList.data?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email.toLowerCase());
  }

  if (!users || users.length === 0) return NextResponse.json({ sent: 0 });
  const userIds = users.map((u) => u.id);

  // 2) Bulk context: active paid subs, completed lessons, already-sent drips
  const [{ data: subs }, { data: lessons }, { data: sentRows }] = await Promise.all([
    db.from("subscriptions").select("user_id, tier_id").eq("status", "active").in("user_id", userIds),
    db.from("lessons").select("user_id, started_at").not("ended_at", "is", null).in("user_id", userIds),
    db.from("drip_emails").select("user_id, email_key").in("user_id", userIds),
  ]);

  const paidUsers = new Set((subs ?? []).filter((s) => s.tier_id !== "free").map((s) => s.user_id));
  const lessonStats = new Map<string, { count: number; last: number }>();
  for (const l of lessons ?? []) {
    const cur = lessonStats.get(l.user_id) ?? { count: 0, last: 0 };
    cur.count += 1;
    cur.last = Math.max(cur.last, new Date(l.started_at).getTime());
    lessonStats.set(l.user_id, cur);
  }
  const sentKeys = new Map<string, Set<string>>();
  for (const r of sentRows ?? []) {
    if (!sentKeys.has(r.user_id)) sentKeys.set(r.user_id, new Set());
    sentKeys.get(r.user_id)!.add(r.email_key);
  }

  let sent = 0;
  const errors: string[] = [];

  for (const u of users) {
    try {
      const email = emailById.get(u.id);
      if (!email || ffEmails.has(email)) continue;
      if (paidUsers.has(u.id)) continue; // paying users: no drip (transactional only)

      const already = sentKeys.get(u.id) ?? new Set<string>();
      const stats = lessonStats.get(u.id) ?? { count: 0, last: 0 };
      const trialStart = new Date(u.trial_started_at ?? u.created_at).getTime();
      const trialEnd = trialStart + (TRIAL_DAYS + Number(u.trial_extension_days ?? 0)) * DAY_MS;
      const daysSince = Math.floor((now - trialStart) / DAY_MS);
      const daysToEnd = Math.ceil((trialEnd - now) / DAY_MS);

      // Determine which keys are DUE right now
      const due = new Set<DripKey>();
      if (daysToEnd <= 0) {
        if (Number(u.trial_extension_days ?? 0) === 0) due.add("trial_expired");
      } else {
        if (daysToEnd <= 1) due.add("trial_1day");
        else if (daysToEnd <= 3) due.add("trial_3days");
        if (stats.count === 0) {
          if (daysSince >= 7) due.add("nudge_day7");
          else if (daysSince >= 3) due.add("nudge_day3");
          else if (daysSince >= 1) due.add("nudge_day1");
        } else {
          due.add("congrats_first_lesson");
          if (now - stats.last >= 3 * DAY_MS) due.add("inactive_3d");
        }
      }

      const key = PRIORITY.find((k) => due.has(k) && !already.has(k));
      if (!key) continue;

      const locale = u.ui_language === "en" ? "en" : "pl";
      const { subject, html } = buildDripEmail(key, {
        name: u.display_name ?? (locale === "pl" ? "językowy śmiałku" : "language adventurer"),
        locale,
        nativeLang: u.native_language,
        appUrl,
        extendUrl: `${appUrl}/api/trial/extend-link?token=${u.trial_extension_token}`,
        trialDaysLeft: Math.max(0, daysToEnd),
      });

      const { error: sendErr } = await resend.emails.send({
        from: `Maciej z Godoj.co <${process.env.RESEND_FROM_EMAIL ?? "maciej@godoj.co"}>`,
        to: email,
        replyTo: "maciej@godoj.co",
        subject,
        html,
      });
      if (sendErr) {
        errors.push(`${u.id}:${key}:${sendErr.message}`);
        continue;
      }

      await db.from("drip_emails").insert({ user_id: u.id, email_key: key });
      sent++;
    } catch (err) {
      errors.push(`${u.id}:${String(err)}`);
    }
  }

  return NextResponse.json({ sent, errors: errors.slice(0, 10) });
}

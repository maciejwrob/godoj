import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserSubscription } from "@/lib/subscription";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang");

    // ── Phase 1: parallel queries that don't need activeLang ──
    const now = new Date();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const mStart = new Date(); mStart.setDate(1); mStart.setHours(0, 0, 0, 0);

    const [
      { data: profiles },
      { data: userData },
      { data: streakRow },
      { data: achievements },
      { count: totalLessonsCount },
      { data: todayUsage },
      { data: monthUsage },
    ] = await Promise.all([
      supabase.from("user_profiles")
        .select("target_language, language_variant, current_level, selected_agent_id, xp_current, xp_total")
        .eq("user_id", user.id).order("created_at"),
      supabase.from("users")
        .select("display_name, role")
        .eq("id", user.id).single(),
      supabase.from("streaks")
        .select("current_streak, weekly_minutes_goal, weekly_minutes_done, week_start")
        .eq("user_id", user.id).single(),
      supabase.from("user_achievements")
        .select("achievement_id, earned_at, achievements(name_pl, icon)")
        .eq("user_id", user.id).order("earned_at", { ascending: false }).limit(3),
      supabase.from("lessons")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id).not("ended_at", "is", null),
      supabase.from("lessons")
        .select("duration_seconds")
        .eq("user_id", user.id).gte("started_at", todayStart.toISOString()),
      supabase.from("lessons")
        .select("duration_seconds")
        .eq("user_id", user.id).gte("started_at", mStart.toISOString()),
    ]);

    // Determine active language from profiles
    const activeProfile = lang
      ? (profiles ?? []).find((p: { target_language: string }) => p.target_language === lang)
      : (profiles ?? [])[0];
    const activeLang = activeProfile?.target_language ?? (profiles ?? [])[0]?.target_language ?? "";

    // ── Phase 2: parallel queries that need activeLang ──
    const mondayOffset = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const monday = new Date(now); monday.setDate(monday.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const [
      { data: lessons },
      { data: allLangLessons },
      { data: weekLessons },
      { count: vocabCount },
    ] = await Promise.all([
      supabase.from("lessons")
        .select("id, started_at, duration_seconds, topic, fluency_score, language")
        .eq("user_id", user.id).eq("language", activeLang)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false }).limit(5),
      supabase.from("lessons")
        .select("duration_seconds")
        .eq("user_id", user.id).eq("language", activeLang)
        .not("ended_at", "is", null),
      supabase.from("lessons")
        .select("duration_seconds")
        .eq("user_id", user.id).eq("language", activeLang)
        .not("ended_at", "is", null)
        .gte("started_at", monday.toISOString()),
      supabase.from("vocabulary")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("language", activeLang),
    ]);

    // ── Compute aggregates ──
    const totalMinutes = (allLangLessons ?? []).reduce(
      (sum: number, l: { duration_seconds: number | null }) => sum + Math.round((l.duration_seconds ?? 0) / 60), 0
    );
    const weeklyMinutesLang = (weekLessons ?? []).reduce(
      (sum: number, l: { duration_seconds: number | null }) => sum + Math.round((l.duration_seconds ?? 0) / 60), 0
    );
    const langStreak = streakRow?.current_streak ?? 0;

    // ── Phase 3: feedback check (needs lessons result) ──
    const lastLesson = (lessons ?? [])[0];
    let needsFeedback = false;
    let feedbackLessonId: string | null = null;
    if (lastLesson) {
      const { data: fb } = await supabase.from("feedback").select("id").eq("lesson_id", lastLesson.id).limit(1).single();
      needsFeedback = !fb;
      feedbackLessonId = lastLesson.id;
    }

    // Resolve agent IDs for profiles where selected_agent_id is null
    // (same fallback as lessons/start — find first active agent for the language)
    const resolvedProfiles = await Promise.all(
      (profiles ?? []).map(async (p: { target_language: string; language_variant: string | null; current_level: string; selected_agent_id: string | null; xp_current: number; xp_total: number }) => {
        if (p.selected_agent_id) return p;
        const { data: fallback } = await supabase
          .from("agents_config")
          .select("id")
          .eq("language", p.target_language)
          .eq("is_active", true)
          .limit(1)
          .single();
        return { ...p, selected_agent_id: fallback?.id ?? null };
      })
    );

    // Subscription-based usage limits
    const subscription = await getUserSubscription(user.id, user.email ?? undefined);

    return NextResponse.json({
      displayName: userData?.display_name ?? "Uzytkownik",
      role: userData?.role ?? "adult",
      profiles: resolvedProfiles,
      activeProfile: resolvedProfiles.find(p => p.target_language === activeLang) ?? activeProfile ?? null,
      activeLang,
      currentLevel: activeProfile?.current_level ?? "A1",
      xpCurrent: activeProfile?.xp_current ?? 0,
      xpTotal: activeProfile?.xp_total ?? 0,
      currentStreak: langStreak,
      weeklyGoal: streakRow?.weekly_minutes_goal ?? 30,
      weeklyDone: weeklyMinutesLang,
      lessons: lessons ?? [],
      achievements: achievements ?? [],
      vocabCount: vocabCount ?? 0,
      totalMinutes,
      totalLessonsCount: totalLessonsCount ?? 0,
      needsFeedback,
      feedbackLessonId,
      subscription: {
        tier: subscription.tier,
        tierNamePl: subscription.tierNamePl,
        minutesUsed: subscription.minutesUsed,
        minutesLimit: subscription.minutesLimit,
        minutesRemaining: subscription.minutesRemaining,
        unlimited: subscription.isUnlimited,
        periodEnd: subscription.periodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

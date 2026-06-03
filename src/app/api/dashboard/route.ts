import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang");

    // Get all profiles
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("target_language, language_variant, current_level, selected_agent_id, xp_current, xp_total")
      .eq("user_id", user.id)
      .order("created_at");

    // Active profile
    const activeProfile = lang
      ? (profiles ?? []).find((p: { target_language: string }) => p.target_language === lang)
      : (profiles ?? [])[0];

    const activeLang = activeProfile?.target_language ?? (profiles ?? [])[0]?.target_language ?? "";

    // User data
    const { data: userData } = await supabase
      .from("users")
      .select("display_name, role")
      .eq("id", user.id)
      .single();

    // Streak — global row (has current_streak, weekly goal, weekly done)
    const { data: streakRow } = await supabase
      .from("streaks")
      .select("current_streak, weekly_minutes_goal, weekly_minutes_done, week_start")
      .eq("user_id", user.id)
      .single();

    // Recent lessons for display (limited to 5)
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, started_at, duration_seconds, topic, fluency_score, language")
      .eq("user_id", user.id)
      .eq("language", activeLang)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(5);

    // Aggregate: total minutes for this language (all time, no limit)
    const { data: allLangLessons } = await supabase
      .from("lessons")
      .select("duration_seconds")
      .eq("user_id", user.id)
      .eq("language", activeLang)
      .not("ended_at", "is", null);

    // Achievements
    const { data: achievements } = await supabase
      .from("user_achievements")
      .select("achievement_id, earned_at, achievements(name_pl, icon)")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false })
      .limit(3);

    // Vocab count filtered by language
    const { count: vocabCount } = await supabase
      .from("vocabulary")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("language", activeLang);

    // Total minutes from ALL lessons for this language (not limited to 5)
    const totalMinutes = (allLangLessons ?? []).reduce(
      (sum: number, l: { duration_seconds: number | null }) => sum + Math.round((l.duration_seconds ?? 0) / 60), 0
    );

    // Weekly minutes: query lessons from this week for this language
    const now = new Date();
    const mondayOffset = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const monday = new Date(now); monday.setDate(monday.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const { data: weekLessons } = await supabase
      .from("lessons")
      .select("duration_seconds")
      .eq("user_id", user.id)
      .eq("language", activeLang)
      .not("ended_at", "is", null)
      .gte("started_at", monday.toISOString());

    const weeklyMinutesLang = (weekLessons ?? []).reduce(
      (sum: number, l: { duration_seconds: number | null }) => sum + Math.round((l.duration_seconds ?? 0) / 60), 0
    );

    // Streak from streaks table (maintained by lesson end logic)
    const langStreak = streakRow?.current_streak ?? 0;

    // Check if first lesson ever (for feedback popup)
    const { count: totalLessonsCount } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("ended_at", "is", null);

    // Check if last lesson has feedback
    const lastLesson = (lessons ?? [])[0];
    let needsFeedback = false;
    let feedbackLessonId: string | null = null;
    if (lastLesson) {
      const { data: fb } = await supabase.from("feedback").select("id").eq("lesson_id", lastLesson.id).limit(1).single();
      needsFeedback = !fb;
      feedbackLessonId = lastLesson.id;
    }

    // Trial usage limits
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

    const todayMinutesUsed = Math.round((todayUsage ?? []).reduce((s, l) => s + (l.duration_seconds ?? 0), 0) / 60);
    const monthMinutesUsed = Math.round((monthUsage ?? []).reduce((s, l) => s + (l.duration_seconds ?? 0), 0) / 60);

    return NextResponse.json({
      displayName: userData?.display_name ?? "Uzytkownik",
      role: userData?.role ?? "adult",
      profiles: profiles ?? [],
      activeProfile: activeProfile ?? null,
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
      trialUsage: {
        todayMinutes: todayMinutesUsed,
        dailyLimit: dailyLimitMin,
        monthMinutes: monthMinutesUsed,
        monthlyLimit: monthlyLimitMin,
        unlimited: isUnlimited,
        tier: isUnlimited ? "friends_family" : "beta",
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

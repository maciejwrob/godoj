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
      .select("target_language, language_variant, current_level, selected_agent_id")
      .eq("user_id", user.id)
      .order("created_at");

    // Active profile
    const activeProfile = lang
      ? (profiles ?? []).find((p: { target_language: string }) => p.target_language === lang)
      : (profiles ?? [])[0];

    const activeLang = activeProfile?.target_language ?? "no";

    // User data
    const { data: userData } = await supabase
      .from("users")
      .select("display_name, role")
      .eq("id", user.id)
      .single();

    // Streak — global row (for weekly goal setting)
    const { data: streakRow } = await supabase
      .from("streaks")
      .select("weekly_minutes_goal")
      .eq("user_id", user.id)
      .single();

    // Lessons filtered by language
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, started_at, duration_seconds, topic, fluency_score, language")
      .eq("user_id", user.id)
      .eq("language", activeLang)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(5);

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

    const totalMinutes = (lessons ?? []).reduce(
      (sum: number, l: { duration_seconds: number | null }) => sum + Math.round((l.duration_seconds ?? 0) / 60), 0
    );

    // Calculate streak and weekly minutes FROM lessons for this language
    const now = new Date();
    const mondayOffset = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const monday = new Date(now); monday.setDate(monday.getDate() - mondayOffset);
    const weekStartStr = monday.toISOString().split("T")[0];

    // Weekly minutes for this language
    const weeklyMinutesLang = (lessons ?? [])
      .filter((l: { started_at: string }) => l.started_at.split("T")[0] >= weekStartStr)
      .reduce((sum: number, l: { duration_seconds: number | null }) => sum + Math.round((l.duration_seconds ?? 0) / 60), 0);

    // Streak for this language: count consecutive days with lessons
    const lessonDates = [...new Set((lessons ?? []).map((l: { started_at: string }) => l.started_at.split("T")[0]))].sort().reverse();
    let langStreak = 0;
    const today = now.toISOString().split("T")[0];
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Start from today; if no lesson today, start from yesterday (streak still valid)
    let checkDate = today;
    if (lessonDates.length > 0 && lessonDates[0] !== today && lessonDates[0] === yesterdayStr) {
      checkDate = yesterdayStr;
    }
    for (const d of lessonDates) {
      if (d === checkDate) {
        langStreak++;
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        checkDate = prev.toISOString().split("T")[0];
      } else if (d < checkDate) {
        break;
      }
    }

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

    return NextResponse.json({
      displayName: userData?.display_name ?? "Uzytkownik",
      role: userData?.role ?? "adult",
      profiles: profiles ?? [],
      activeProfile: activeProfile ?? null,
      activeLang,
      currentLevel: activeProfile?.current_level ?? "A1",
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
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

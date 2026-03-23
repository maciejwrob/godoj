import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { lesson_id } = await request.json();

    // Fetch all needed data in parallel
    const [
      { data: allAchievements },
      { data: userAchievements },
      { data: lessons },
      { data: streak },
      { data: vocabCount },
      { data: masteredCount },
      { data: currentLesson },
    ] = await Promise.all([
      supabase.from("achievements").select("*"),
      supabase.from("user_achievements").select("achievement_id").eq("user_id", user.id),
      supabase.from("lessons").select("id, duration_seconds, fluency_score, topic, started_at, level_at_start, level_at_end").eq("user_id", user.id).not("ended_at", "is", null).order("started_at", { ascending: false }),
      supabase.from("streaks").select("*").eq("user_id", user.id).single(),
      supabase.from("vocabulary").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("vocabulary").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("mastery_level", 4),
      lesson_id ? supabase.from("lessons").select("*, summary_json").eq("id", lesson_id).single() : Promise.resolve({ data: null }),
    ]);

    const earned = new Set((userAchievements ?? []).map((ua: { achievement_id: string }) => ua.achievement_id));
    const completedLessons = lessons ?? [];
    const totalMinutes = completedLessons.reduce((sum: number, l: { duration_seconds: number | null }) => sum + Math.round((l.duration_seconds ?? 0) / 60), 0);
    const totalVocab = vocabCount ?? 0;
    const totalMastered = masteredCount ?? 0;
    const uniqueTopics = new Set(completedLessons.map((l: { topic: string | null }) => l.topic).filter(Boolean)).size;

    // New vocab in current lesson
    let newWordsInLesson = 0;
    if (currentLesson?.summary_json) {
      const summary = currentLesson.summary_json as { new_vocabulary?: unknown[] };
      newWordsInLesson = summary.new_vocabulary?.length ?? 0;
    }

    // Check fluency streak (consecutive lessons with fluency >= 4)
    let fluencyStreak = 0;
    for (const l of completedLessons) {
      if ((l as { fluency_score: number | null }).fluency_score && (l as { fluency_score: number }).fluency_score >= 4) {
        fluencyStreak++;
      } else break;
    }

    // Level ups
    const levelUps = completedLessons.filter((l: { level_at_start: string | null; level_at_end: string | null }) => l.level_at_end && l.level_at_start && l.level_at_end !== l.level_at_start && l.level_at_end > l.level_at_start).length;

    const levelMap: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 };
    const currentLevel = completedLessons[0]?.level_at_end ?? "A1";
    const currentLevelNum = levelMap[currentLevel] ?? 1;

    // Current lesson time
    const lessonHour = currentLesson ? new Date(currentLesson.started_at).getHours() : 12;
    const lessonDay = currentLesson ? new Date(currentLesson.started_at).getDay() : 1;
    const lessonDuration = currentLesson?.duration_seconds ?? 0;

    // Comeback: days since previous lesson
    let comebackDays = 0;
    if (completedLessons.length >= 2) {
      const prev = new Date(completedLessons[1].started_at);
      const curr = new Date(completedLessons[0].started_at);
      comebackDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    }

    const newlyEarned: string[] = [];

    for (const a of (allAchievements ?? [])) {
      if (earned.has(a.id)) continue;

      let qualifies = false;
      switch (a.requirement_type) {
        case "lessons_count": qualifies = completedLessons.length >= a.requirement_value; break;
        case "total_minutes": qualifies = totalMinutes >= a.requirement_value; break;
        case "streak_days": qualifies = (streak?.current_streak ?? 0) >= a.requirement_value; break;
        case "weekly_goals": qualifies = false; break; // TODO: track weekly goal completions
        case "vocab_count": qualifies = totalVocab >= a.requirement_value; break;
        case "mastery_count": qualifies = totalMastered >= a.requirement_value; break;
        case "words_per_lesson": qualifies = newWordsInLesson >= a.requirement_value; break;
        case "fluency_score": qualifies = (currentLesson?.fluency_score ?? 0) >= a.requirement_value; break;
        case "fluency_streak": qualifies = fluencyStreak >= a.requirement_value; break;
        case "level_ups": qualifies = levelUps >= a.requirement_value; break;
        case "level_reached": qualifies = currentLevelNum >= a.requirement_value; break;
        case "unique_topics": qualifies = uniqueTopics >= a.requirement_value; break;
        case "lesson_duration": qualifies = lessonDuration >= a.requirement_value; break;
        case "short_lesson": qualifies = lessonDuration > 0 && lessonDuration <= 300; break;
        case "comeback_days": qualifies = comebackDays >= a.requirement_value; break;
        case "night_lesson": qualifies = lessonHour >= 22; break;
        case "early_lesson": qualifies = lessonHour < 7; break;
        case "weekend_lessons": qualifies = lessonDay === 0 || lessonDay === 6; break;
      }

      if (qualifies) {
        const { error } = await supabase.from("user_achievements").insert({
          user_id: user.id,
          achievement_id: a.id,
        });
        if (!error) newlyEarned.push(a.id);
      }
    }

    // Fetch full info for newly earned
    let earnedDetails: { id: string; name_pl: string; icon: string; tier: string }[] = [];
    if (newlyEarned.length > 0) {
      const { data } = await supabase.from("achievements").select("id, name_pl, icon, tier").in("id", newlyEarned);
      earnedDetails = data ?? [];
    }

    return NextResponse.json({ newly_earned: earnedDetails });
  } catch (error) {
    console.error("Achievement check error:", error);
    return NextResponse.json({ newly_earned: [] });
  }
}

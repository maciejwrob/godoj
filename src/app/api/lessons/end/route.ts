import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lesson_id, transcript, duration_seconds } = await request.json();

    // Get lesson, profile, and user data
    const [{ data: lesson }, { data: profile }, { data: userData }] = await Promise.all([
      supabase
        .from("lessons")
        .select("language, level_at_start")
        .eq("id", lesson_id)
        .single(),
      supabase
        .from("user_profiles")
        .select("current_level, target_language")
        .eq("user_id", user.id)
        .limit(1)
        .single(),
      supabase
        .from("users")
        .select("display_name")
        .eq("id", user.id)
        .single(),
    ]);
    const userName = userData?.display_name ?? "Użytkownik";

    if (!lesson) {
      return NextResponse.json(
        { error: "Lekcja nie znaleziona" },
        { status: 404 }
      );
    }

    const langNames: Record<string, string> = {
      es: "hiszpański",
      en: "angielski",
      no: "norweski",
      fr: "francuski",
    };
    const langName = langNames[lesson.language] ?? lesson.language;

    // Analyze transcript via Claude
    const analysisResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Jesteś ekspertem od nauki języków. Przeanalizuj poniższy transkrypt rozmowy.
Zwracaj się bezpośrednio do użytkownika po imieniu (${userName}). Mów "Ty", nie "uczeń" czy "uczestnik".
Np. "${userName}, świetna robota! Nauczyłeś się 5 nowych słów." Bądź ciepły i motywujący.

Język: ${langName}
Poziom ucznia: ${lesson.level_at_start}
Czas trwania: ${Math.round(duration_seconds / 60)} minut
Transkrypt:
${transcript || "Brak transkryptu"}

Przygotuj analizę w formacie JSON (bez markdown, tylko czysty JSON):
{
  "fluency_score": (1.0-5.0, bazując na płynności i złożoności wypowiedzi),
  "topics_covered": ["temat1", "temat2"],
  "new_vocabulary": [
    {"word": "słowo", "translation": "tłumaczenie", "context": "zdanie z rozmowy"}
  ],
  "struggled_phrases": ["fraza1", "fraza2"],
  "level_assessment": {
    "current": "${lesson.level_at_start}",
    "recommended": "${lesson.level_at_start}" lub wyższy/niższy jeśli uzasadnione,
    "reasoning": "krótkie wyjaśnienie"
  },
  "summary_pl": "2-3 zdania po polsku: co user robił dobrze i nad czym pracować",
  "next_lesson_context": "1-2 zdania kontekstu do następnej lekcji"
}`,
        },
      ],
    });

    const analysisText =
      analysisResponse.content[0].type === "text"
        ? analysisResponse.content[0].text
        : "{}";

    const cleaned = analysisText.replace(/```json\n?|\n?```/g, "").trim();
    let summary;
    try {
      summary = JSON.parse(cleaned);
    } catch {
      summary = {
        fluency_score: 3.0,
        topics_covered: [],
        new_vocabulary: [],
        struggled_phrases: [],
        level_assessment: {
          current: lesson.level_at_start,
          recommended: lesson.level_at_start,
          reasoning: "Nie udało się przeanalizować transkryptu",
        },
        summary_pl: "Lekcja ukończona. Kontynuuj ćwiczenia!",
        next_lesson_context: "",
      };
    }

    // Update lesson record
    await supabase
      .from("lessons")
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds,
        fluency_score: summary.fluency_score,
        summary_json: summary,
        transcript: transcript || null,
        level_at_end: summary.level_assessment?.recommended ?? lesson.level_at_start,
      })
      .eq("id", lesson_id);

    // Update level if changed
    const recommendedLevel = summary.level_assessment?.recommended;
    if (recommendedLevel && recommendedLevel !== lesson.level_at_start) {
      await supabase
        .from("user_profiles")
        .update({ current_level: recommendedLevel })
        .eq("user_id", user.id)
        .eq("target_language", lesson.language);
    }

    // Add vocabulary
    if (summary.new_vocabulary?.length > 0) {
      const vocabItems = summary.new_vocabulary.map(
        (v: { word: string; translation: string; context?: string }) => ({
          user_id: user.id,
          language: lesson.language,
          word: v.word,
          translation: v.translation,
          context_sentence: v.context ?? null,
          lesson_id,
        })
      );
      await supabase.from("vocabulary").insert(vocabItems);
    }

    // Update streaks (use admin client to bypass RLS)
    const adminDb = createAdminClient();
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const lessonMinutes = Math.max(1, Math.round(duration_seconds / 60));

    // Calculate Monday of current week
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - mondayOffset);
    const weekStart = monday.toISOString().split("T")[0];

    const { data: streak } = await adminDb
      .from("streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (streak) {
      const lastDate = streak.last_lesson_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      // Calculate streak
      let newStreak = streak.current_streak;
      if (lastDate === today) {
        // Already counted today — don't change streak
      } else if (lastDate === yesterday) {
        newStreak += 1;
      } else {
        // Gap > 1 day — reset streak
        newStreak = 1;
      }

      // Weekly minutes: reset if new week, otherwise add
      const isNewWeek = !streak.week_start || streak.week_start < weekStart;
      const weeklyMinutes = isNewWeek ? lessonMinutes : streak.weekly_minutes_done + lessonMinutes;

      const { error: streakError } = await adminDb
        .from("streaks")
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak),
          last_lesson_date: today,
          weekly_minutes_done: weeklyMinutes,
          week_start: isNewWeek ? weekStart : streak.week_start,
        })
        .eq("user_id", user.id);

      if (streakError) console.error("Streak update error:", streakError);
      else console.log("Streak updated:", { newStreak, today, weeklyMinutes });
    } else {
      // Create streaks row if missing
      await adminDb.from("streaks").insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_lesson_date: today,
        weekly_minutes_goal: 30,
        weekly_minutes_done: lessonMinutes,
        week_start: weekStart,
      });
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("End lesson error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas analizy lekcji" },
      { status: 500 }
    );
  }
}

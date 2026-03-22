import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    // Get lesson and profile data
    const [{ data: lesson }, { data: profile }] = await Promise.all([
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
    ]);

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

    // Update streaks
    const today = new Date().toISOString().split("T")[0];
    const { data: streak } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (streak) {
      const lastDate = streak.last_lesson_date;
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];

      let newStreak = streak.current_streak;
      if (lastDate === yesterday) {
        newStreak += 1;
      } else if (lastDate !== today) {
        newStreak = 1;
      }

      const minutesDone =
        streak.weekly_minutes_done + Math.round(duration_seconds / 60);

      await supabase
        .from("streaks")
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak),
          last_lesson_date: today,
          weekly_minutes_done: minutesDone,
        })
        .eq("user_id", user.id);
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

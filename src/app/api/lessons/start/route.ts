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

    const { language, agent_id } = await request.json();

    // Get user data
    const [{ data: userData }, { data: profile }, { data: lastLesson }] =
      await Promise.all([
        supabase
          .from("users")
          .select("display_name")
          .eq("id", user.id)
          .single(),
        supabase
          .from("user_profiles")
          .select(
            "current_level, interests, learning_goals, preferred_duration_min"
          )
          .eq("user_id", user.id)
          .eq("target_language", language)
          .single(),
        supabase
          .from("lessons")
          .select("summary_json, topic")
          .eq("user_id", user.id)
          .eq("language", language)
          .order("started_at", { ascending: false })
          .limit(1)
          .single(),
      ]);

    const level = profile?.current_level ?? "A1";
    const interests = profile?.interests ?? [];
    const goals = profile?.learning_goals ?? [];
    const duration = profile?.preferred_duration_min ?? 15;
    const displayName = userData?.display_name ?? "Użytkownik";

    const langNames: Record<string, string> = {
      es: "hiszpańskim",
      en: "angielskim",
      no: "norweskim",
      fr: "francuskim",
    };
    const langName = langNames[language] ?? language;

    // Generate topic via Claude
    const topicResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: `Bazując na zainteresowaniach użytkownika: ${interests.join(", ")} i poziomie ${level}, zaproponuj jeden naturalny temat do rozmowy po ${langName}. Odpowiedz tylko tematem, max 10 słów. Po polsku.`,
        },
      ],
    });

    const topic =
      topicResponse.content[0].type === "text"
        ? topicResponse.content[0].text.trim()
        : "Luźna rozmowa";

    // Build system prompt override
    const lastLessonContext = lastLesson?.summary_json
      ? `\n\nKontekst z poprzedniej lekcji: ${(lastLesson.summary_json as Record<string, unknown>).next_lesson_context ?? "brak"}`
      : "";

    const systemPromptOverride = `Rozmawiasz z ${displayName}. Poziom języka: ${level} (CEFR).
Cele nauki: ${goals.join(", ") || "ogólna konwersacja"}.
Zainteresowania: ${interests.join(", ") || "różne tematy"}.
Temat dzisiejszej rozmowy: ${topic}.
Czas lekcji: ${duration} minut.

ZASADY:
- Dostosuj złożoność języka do poziomu ${level}
- Bądź cierpliwy, zachęcający i naturalny
- Delikatnie poprawiaj błędy w trakcie rozmowy
- Gdy zbliża się koniec czasu, naturalnie zakończ rozmowę
- Mów TYLKO w języku docelowym, chyba że uczeń naprawdę nie rozumie
- Jeśli uczeń się zacina, pomóż mu — zaproponuj łatwiejsze sformułowanie${lastLessonContext}`;

    // Get signed URL from ElevenLabs
    const signedUrlResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agent_id}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text();
      console.error("ElevenLabs signed URL error:", errorText);
      return NextResponse.json(
        { error: "Nie udało się połączyć z tutorem" },
        { status: 502 }
      );
    }

    const { signed_url } = await signedUrlResponse.json();

    // Create lesson record
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .insert({
        user_id: user.id,
        language,
        agent_id,
        topic,
        level_at_start: level,
      })
      .select("id")
      .single();

    if (lessonError) {
      console.error("Lesson creation error:", lessonError);
      return NextResponse.json(
        { error: "Nie udało się utworzyć lekcji" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signed_url,
      lesson_id: lesson.id,
      topic,
      system_prompt_override: systemPromptOverride,
      duration,
      display_name: displayName,
      level,
    });
  } catch (error) {
    console.error("Start lesson error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}

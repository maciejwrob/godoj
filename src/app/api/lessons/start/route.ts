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

    // Look up ElevenLabs agent ID from agents_config
    const { data: agentConfig } = await supabase
      .from("agents_config")
      .select("elevenlabs_agent_id, voice_name")
      .eq("id", agent_id)
      .single();

    const elevenlabsAgentId = agentConfig?.elevenlabs_agent_id ?? agent_id;
    const agentName = agentConfig?.voice_name ?? agent_id;

    // Get user data
    const [{ data: userData }, { data: profile }, { data: lastLesson }] =
      await Promise.all([
        supabase
          .from("users")
          .select("display_name, native_language")
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
    const nativeLanguage = userData?.native_language ?? "pl";

    const langNames: Record<string, string> = {
      es: "hiszpańskim", en: "angielskim", no: "norweskim", fr: "francuskim",
      it: "włoskim", sv: "szwedzkim", de: "niemieckim", fi: "fińskim",
      pt: "portugalskim", hu: "węgierskim",
    };
    const langName = langNames[language] ?? language;

    const langNamesEn: Record<string, string> = {
      no: "Norwegian", es: "Spanish", en: "English", fr: "French",
      sv: "Swedish", it: "Italian", pt: "Portuguese", de: "German",
      hu: "Hungarian", fi: "Finnish",
    };
    const languageNameEn = langNamesEn[language] ?? language;

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

    // Generate dynamic first message
    const lastLessonDate = lastLesson ? "niedawno" : null;
    const lastLessonSummary = lastLesson?.summary_json
      ? (lastLesson.summary_json as Record<string, unknown>).next_lesson_context ?? ""
      : "";

    const firstMsgResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 80,
      messages: [{
        role: "user",
        content: `Jesteś ${agentName}, tutor ${languageNameEn}. Użytkownik to ${displayName}.
${lastLessonSummary ? `Kontekst z poprzedniej lekcji: ${lastLessonSummary}` : "To pierwsza lekcja tego użytkownika."}
Dzisiejszy temat: ${topic}.

Wygeneruj naturalne powitanie w ${languageNameEn} (max 2 krótkie zdania) na poziomie ${level}.
- Jeśli to pierwsza lekcja: przywitaj się i przedstaw krótko
- Jeśli była poprzednia lekcja: nawiąż do niej naturalnie
- Bądź naturalny, ciepły, jak przyjaciel
- NIE mów zawsze "Hvordan går det?" — bądź kreatywny

Odpowiedz TYLKO tekstem powitania w ${languageNameEn}, nic więcej.`,
      }],
    });

    const firstMessage = firstMsgResponse.content[0].type === "text"
      ? firstMsgResponse.content[0].text.trim()
      : "";

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
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${elevenlabsAgentId}`,
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
      native_language: nativeLanguage,
      language_name: languageNameEn,
      agent_name: agentName,
      first_message: firstMessage,
    });
  } catch (error) {
    console.error("Start lesson error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}

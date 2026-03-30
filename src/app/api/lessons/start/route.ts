import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
import { getAgentSystemPrompt, type PromptVars } from "@/config/agent-prompt";
import { CONVERSATION_TOPICS } from "@/config/conversation-topics";

async function serverLogError(userId: string | null, page: string, message: string, context: Record<string, unknown> = {}) {
  try {
    const admin = createAdminClient();
    await admin.from("error_logs").insert({ user_id: userId, page, error_message: message, error_context: context });
  } catch {}
}

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
    let { data: agentConfig } = await supabase
      .from("agents_config")
      .select("elevenlabs_agent_id, voice_name")
      .eq("id", agent_id)
      .single();

    // Fallback: if requested agent not found, try first active agent for this language
    if (!agentConfig) {
      console.log(`[lessons/start] Agent '${agent_id}' not found, falling back to first active agent for language '${language}'`);
      const { data: fallbackAgent } = await supabase
        .from("agents_config")
        .select("elevenlabs_agent_id, voice_name")
        .eq("language", language)
        .eq("is_active", true)
        .limit(1)
        .single();
      agentConfig = fallbackAgent;
    }

    if (!agentConfig) {
      await serverLogError(user.id, "/api/lessons/start", "Agent not found in agents_config", { agent_id, language });
      return NextResponse.json(
        { error: "Nie znaleziono tutora. Skontaktuj się z administratorem." },
        { status: 400 }
      );
    }

    if (!agentConfig.elevenlabs_agent_id) {
      await serverLogError(user.id, "/api/lessons/start", "Agent has no elevenlabs_agent_id", { agent_id });
      return NextResponse.json(
        { error: "Tutor nie ma skonfigurowanego identyfikatora ElevenLabs." },
        { status: 500 }
      );
    }

    const elevenlabsAgentId = agentConfig.elevenlabs_agent_id;
    const agentName = agentConfig.voice_name;

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
      pt: "portugalskim", hu: "węgierskim", ko: "koreańskim",
    };
    const langName = langNames[language] ?? language;

    const langNamesEn: Record<string, string> = {
      no: "Norwegian", es: "Spanish", en: "English", fr: "French",
      sv: "Swedish", it: "Italian", pt: "Portuguese", de: "German",
      hu: "Hungarian", fi: "Finnish", ko: "Korean",
    };
    const languageNameEn = langNamesEn[language] ?? language;

    // Fetch recent topics to avoid repetition
    const { data: recentLessons } = await supabase
      .from("lessons")
      .select("topic")
      .eq("user_id", user.id)
      .eq("language", language)
      .order("started_at", { ascending: false })
      .limit(10);
    const recentTopics = (recentLessons ?? []).map(l => l.topic).filter(Boolean);

    // Get topic pool for this level
    const levelKey = level.startsWith("A1") ? "A1" : level.startsWith("A2") ? "A2" : level.startsWith("B1") ? "B1" : level.startsWith("B2") ? "B2" : "C1";
    const topicPool = CONVERSATION_TOPICS[levelKey] ?? CONVERSATION_TOPICS["A1"];
    const availableTopics = topicPool.filter(t => !recentTopics.includes(t));
    const poolForPrompt = availableTopics.length > 0 ? availableTopics : topicPool;

    // Pick random samples for Claude inspiration
    const shuffled = [...poolForPrompt].sort(() => Math.random() - 0.5);
    const sampleTopics = shuffled.slice(0, 8).join(", ");

    let topic = "";
    try {
      const topicResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 30,
        messages: [{
          role: "user",
          content: `Suggest a conversation topic for ${languageNameEn} at level ${level}.
${interests.length > 0 ? "User interests: " + interests.join(", ") + "." : ""}
${recentTopics.length > 0 ? "AVOID these recent topics: " + recentTopics.slice(0, 5).join(", ") : ""}
Get inspired by these but feel free to suggest something different: ${sampleTopics}
Reply with ONLY the topic, max 8 words. In Polish. No questions. No period.`,
        }],
      });
      const raw = topicResponse.content[0].type === "text" ? topicResponse.content[0].text.trim() : "";
      if (raw.length > 0 && raw.length < 60 && !raw.includes("?") && !raw.includes("Potrzebuj")) {
        topic = raw;
      }
    } catch {}

    // Fallback: pick random from available pool
    if (!topic) {
      topic = poolForPrompt[Math.floor(Math.random() * poolForPrompt.length)];
    }

    // Generate dynamic first message
    const lastLessonDate = lastLesson ? "niedawno" : null;
    const lastLessonSummary = lastLesson?.summary_json
      ? (lastLesson.summary_json as Record<string, unknown>).next_lesson_context ?? ""
      : "";

    let firstMessage = "";
    try {
      const firstMsgResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
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

Odpowiedz TYLKO tekstem powitania w ${languageNameEn}, nic więcej.`,
        }],
      });
      firstMessage = firstMsgResponse.content[0].type === "text"
        ? firstMsgResponse.content[0].text.trim()
        : "";
    } catch {
      // Fallback — let the voice agent generate its own greeting
      firstMessage = "";
    }

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
      await serverLogError(user.id, "/api/lessons/start", "ElevenLabs signed URL failed", { status: signedUrlResponse.status, error: errorText, elevenlabs_agent_id: elevenlabsAgentId, agent_id: agent_id });
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

    // Build full system prompt with all variables filled in
    const previousCtx = lastLesson?.summary_json
      ? (lastLesson.summary_json as Record<string, unknown>).next_lesson_context as string ?? "To pierwsza rozmowa z tym uzytkownikiem."
      : "To pierwsza rozmowa z tym uzytkownikiem.";

    const promptVars: PromptVars = {
      agent_name: agentName,
      language_name: languageNameEn,
      user_name: displayName,
      user_level: level,
      native_language: nativeLanguage,
      lesson_topic: topic,
      lesson_duration: String(duration),
      previous_context: previousCtx,
      first_message: firstMessage,
    };

    // Try to load custom prompt from DB
    const adminDb = createAdminClient();
    const { data: configRow } = await adminDb.from("app_config").select("value").eq("key", "agent_system_prompt").single();
    const builtPrompt = getAgentSystemPrompt(promptVars, configRow?.value ?? null);

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
      previous_context: previousCtx,
      agent_system_prompt: builtPrompt,
    });
  } catch (error) {
    console.error("Start lesson error:", error);
    await serverLogError(null, "/api/lessons/start", "Unhandled error", { error: String(error) });
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}

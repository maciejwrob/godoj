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

    const {
      lesson_id,
      conversation_context,
      target_language,
      native_language,
      hint_level,
      last_agent_message,
      user_attempt,
      stuck_type,
    } = await request.json();

    const level = hint_level ?? 1;
    console.log(`Hint API: user=${user.id}, L${level}, stuck=${stuck_type}`);

    const { data: lesson } = await supabase
      .from("lessons")
      .select("level_at_start")
      .eq("id", lesson_id)
      .single();

    const cefrLevel = lesson?.level_at_start ?? "A1";

    const langNamesEn: Record<string, string> = {
      es: "Spanish", en: "English", no: "Norwegian", fr: "French",
      it: "Italian", sv: "Swedish", de: "German", fi: "Finnish",
      pt: "Portuguese", hu: "Hungarian", pl: "Polish", uk: "Ukrainian",
    };

    const targetLangName = langNamesEn[target_language] ?? target_language;
    const nativeLangName = langNamesEn[native_language] ?? "English";

    let situationDesc: string;
    switch (stuck_type) {
      case "filler_words":
        situationDesc = `The user is trying to respond but only says "uhh", "hmm" — can't find words.${user_attempt ? ` They said: "${user_attempt}"` : ""}`;
        break;
      case "incomplete_sentence":
        situationDesc = `The user started a sentence but stopped midway: "${user_attempt}"`;
        break;
      default:
        situationDesc = "The user is silent — doesn't know how to respond.";
    }

    const safetyRules = `IMPORTANT RULES FOR HINTS:
- Hints must be appropriate for a language learning context
- Never suggest anything sexual, offensive, rude, or inappropriate
- Keep suggestions related to the conversation topic
- Hints should help the user express everyday, normal thoughts
- Focus on practical vocabulary: food, travel, work, hobbies, weather, family, daily life
- If the conversation context seems to be going in an inappropriate direction, redirect with neutral suggestions`;

    const prompt =
      level === 1
        ? `You are a ${targetLangName} language learning assistant for a ${cefrLevel} level student.

${safetyRules}

Last tutor message: "${last_agent_message || "none"}"
Situation: ${situationDesc}
Conversation context: ${conversation_context}

Suggest 2-3 SINGLE keywords${stuck_type === "incomplete_sentence" ? " to help COMPLETE the started thought" : " to help start a response"}.

Reply ONLY in JSON format (no markdown):
[{"phrase": "word in ${targetLangName}", "translation": "translation in ${nativeLangName}"}]`
        : `You are a ${targetLangName} language learning assistant for a ${cefrLevel} level student.

${safetyRules}

Last tutor message: "${last_agent_message || "none"}"
Situation: ${situationDesc}
Conversation context: ${conversation_context}

Suggest 2-3 FULL phrases/sentences${stuck_type === "incomplete_sentence" ? " that CONTINUE the user's started thought" : " the user could say as a response"}.
Phrases should be natural and at ${cefrLevel} level.

Reply ONLY in JSON format (no markdown):
[{"phrase": "full phrase in ${targetLangName}", "translation": "translation in ${nativeLangName}"}]`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const hints = JSON.parse(cleaned);

    return NextResponse.json({ hints, level });
  } catch (error) {
    console.error("Hint generation error:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować podpowiedzi" },
      { status: 500 }
    );
  }
}

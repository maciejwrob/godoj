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

    const langNames: Record<string, string> = {
      es: "hiszpańskim",
      en: "angielskim",
      no: "norweskim",
      fr: "francuskim",
      pl: "polskim",
      uk: "ukraińskim",
    };

    const targetLangName = langNames[target_language] ?? target_language;
    const nativeLangName = langNames[native_language] ?? "polskim";

    // Build context-aware situation description
    let situationDesc: string;
    switch (stuck_type) {
      case "filler_words":
        situationDesc = `Użytkownik próbuje odpowiedzieć ale mówi tylko "eee", "hmm" — nie może znaleźć słów.${user_attempt ? ` Powiedział: "${user_attempt}"` : ""}`;
        break;
      case "incomplete_sentence":
        situationDesc = `Użytkownik zaczął zdanie ale się zatrzymał w połowie: "${user_attempt}"`;
        break;
      default:
        situationDesc = "Użytkownik milczy — nie wie jak odpowiedzieć.";
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
        ? `Jesteś asystentem nauki ${targetLangName} na poziomie ${cefrLevel}.

${safetyRules}

Ostatnia wypowiedź tutora: "${last_agent_message || "brak"}"
Sytuacja: ${situationDesc}
Kontekst rozmowy: ${conversation_context}

Podaj 2-3 POJEDYNCZE słowa kluczowe${stuck_type === "incomplete_sentence" ? " które pomogą DOKOŃCZYĆ zaczętą myśl" : " które pomogą zacząć odpowiedź"}.

Odpowiedz TYLKO w formacie JSON (bez markdown):
[{"phrase": "słowo", "translation": "tłumaczenie"}]

Słowa w języku ${targetLangName}, tłumaczenia po ${nativeLangName}.`
        : `Jesteś asystentem nauki ${targetLangName} na poziomie ${cefrLevel}.

${safetyRules}

Ostatnia wypowiedź tutora: "${last_agent_message || "brak"}"
Sytuacja: ${situationDesc}
Kontekst rozmowy: ${conversation_context}

Podaj 2-3 PEŁNE frazy/zdania${stuck_type === "incomplete_sentence" ? " które KONTYNUUJĄ zaczętą myśl użytkownika" : " które użytkownik może powiedzieć jako odpowiedź"}.
Frazy powinny być naturalne i na poziomie ${cefrLevel}.

Odpowiedz TYLKO w formacie JSON (bez markdown):
[{"phrase": "pełna fraza", "translation": "tłumaczenie"}]

Frazy w języku ${targetLangName}, tłumaczenia po ${nativeLangName}.`;

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

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
    } = await request.json();

    const level = hint_level ?? 1;
    console.log(`Hint API called: user=${user.id}, level=${level}`);

    // Get user CEFR level
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

    const prompt =
      level === 1
        ? `Użytkownik uczy się ${targetLangName} na poziomie ${cefrLevel}.
Kontekst rozmowy: ${conversation_context}

Użytkownik zawiesił się. Podaj 2-3 POJEDYNCZE słowa kluczowe, które pomogą mu kontynuować.
Tylko słowa, nie frazy ani zdania.

Odpowiedz TYLKO w formacie JSON (bez markdown):
[
  {"phrase": "słowo", "translation": "tłumaczenie"},
  {"phrase": "słowo", "translation": "tłumaczenie"}
]

Słowa w języku ${targetLangName}, tłumaczenia po ${nativeLangName}.`
        : `Użytkownik uczy się ${targetLangName} na poziomie ${cefrLevel}.
Kontekst rozmowy: ${conversation_context}

Użytkownik zawiesił się i potrzebuje więcej pomocy. Podaj 2-3 PEŁNE frazy lub zdania, które może użyć żeby kontynuować rozmowę.

Odpowiedz TYLKO w formacie JSON (bez markdown):
[
  {"phrase": "pełna fraza", "translation": "tłumaczenie"},
  {"phrase": "pełna fraza", "translation": "tłumaczenie"},
  {"phrase": "pełna fraza", "translation": "tłumaczenie"}
]

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

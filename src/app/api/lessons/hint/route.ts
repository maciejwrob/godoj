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

    console.log("Hint API called for user:", user.id);

    const {
      lesson_id,
      conversation_context,
      target_language,
      native_language,
    } = await request.json();

    // Get user level
    const { data: lesson } = await supabase
      .from("lessons")
      .select("level_at_start, language")
      .eq("id", lesson_id)
      .single();

    const level = lesson?.level_at_start ?? "A1";

    const langNames: Record<string, string> = {
      es: "hiszpańskim",
      en: "angielskim",
      no: "norweskim",
      fr: "francuskim",
      pl: "polskim",
    };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Użytkownik uczy się ${langNames[target_language] ?? target_language} na poziomie ${level}.
Kontekst rozmowy: ${conversation_context}

Użytkownik zawiesił się i nie może dokończyć myśli.

Zaproponuj 3 krótkie podpowiedzi (słowa lub frazy) które pomogą mu kontynuować.
Dla każdej podpowiedzi podaj:
- słowo/frazę w języku ${langNames[target_language] ?? target_language}
- tłumaczenie na ${langNames[native_language] ?? "polski"}

Odpowiedz TYLKO w formacie JSON (bez markdown):
[
  {"phrase": "...", "translation": "..."},
  {"phrase": "...", "translation": "..."},
  {"phrase": "...", "translation": "..."}
]`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";

    // Parse JSON, handling potential markdown code blocks
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const hints = JSON.parse(cleaned);

    return NextResponse.json({ hints });
  } catch (error) {
    console.error("Hint generation error:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować podpowiedzi" },
      { status: 500 }
    );
  }
}

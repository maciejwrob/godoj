import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { current_topic, language, user_level, recent_vocabulary } = await request.json();

    const langNames: Record<string, string> = {
      es: "hiszpańskim", en: "angielskim", no: "norweskim", fr: "francuskim",
    };

    const recentWords = (recent_vocabulary ?? []).join(", ");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Zaproponuj 2 przydatne słowa/frazy w języku ${langNames[language] ?? language} na poziomie ${user_level} związane z tematem: ${current_topic}.
Słowa powinny być nieco powyżej aktualnego poziomu użytkownika żeby go rozwijać.
NIE powtarzaj słów z listy: ${recentWords || "brak"}.
Słowa muszą być odpowiednie do nauki języka — codzienne, praktyczne tematy.

Odpowiedz TYLKO w formacie JSON (bez markdown):
[{"word": "słowo po ${langNames[language] ?? language}", "translation": "tłumaczenie po polsku"}]`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const words = JSON.parse(cleaned);

    return NextResponse.json({ words });
  } catch (error) {
    console.error("Enrichment error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

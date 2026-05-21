import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { word, context, source_language, ui_language } = await request.json();

    if (!word || typeof word !== "string") {
      return NextResponse.json({ error: "Word is required" }, { status: 400 });
    }

    const targetLang = ui_language === "en" ? "English" : "Polish";

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: `Translate the word/phrase "${word}" from ${source_language} to ${targetLang}.
${context ? `Context sentence: "${context}"` : ""}

Reply ONLY in this JSON format (no markdown):
{"translation": "...", "note": "..."}

- "translation": the most fitting translation given the context
- "note": optional very brief grammar/usage note (max 8 words), or empty string if not needed`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Translate error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}

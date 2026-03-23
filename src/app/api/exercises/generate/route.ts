import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const EXERCISE_TYPES = [
  "flashcard",
  "translate_to_native",
  "translate_to_target",
  "fill_gap",
  "word_order",
  "matching",
  "listening",
] as const;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { is_challenge } = await request.json();

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("target_language, current_level")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!profile) return NextResponse.json({ error: "No profile" }, { status: 400 });

    // Get vocabulary, prioritizing low mastery
    const { data: vocab } = await supabase
      .from("vocabulary")
      .select("id, word, translation, context_sentence, mastery_level, language")
      .eq("user_id", user.id)
      .eq("language", profile.target_language)
      .order("mastery_level", { ascending: true })
      .order("last_seen_at", { ascending: true })
      .limit(20);

    if (!vocab || vocab.length < 5) {
      return NextResponse.json({
        error: "not_enough_words",
        message: "Porozmawiaj z tutorem żeby zebrać słówka do ćwiczeń!",
        word_count: vocab?.length ?? 0,
      }, { status: 200 });
    }

    // Select 15 words (or less if not enough)
    const selectedWords = vocab.slice(0, Math.min(15, vocab.length));
    const wordList = selectedWords.map((w) => `"${w.word}" (${w.translation})`).join(", ");

    const langNames: Record<string, string> = {
      es: "hiszpański", en: "angielski", no: "norweski", fr: "francuski",
    };
    const lang = langNames[profile.target_language] ?? profile.target_language;
    const level = is_challenge ? "jeden poziom wyżej niż " + profile.current_level : profile.current_level;

    // Generate exercise data via Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `Generuję ćwiczenia językowe (${lang}, poziom ${level}).

Słowa: ${wordList}

Dla KAŻDEGO słowa wygeneruj:
1. distractors_translations: 3 fałszywe tłumaczenia po polsku (semantycznie zbliżone)
2. distractors_words: 3 fałszywe słowa w ${lang} (podobne do oryginału)
3. fill_sentence: zdanie z luką {"sentence_with_gap": "... ____ ...", "answer": "słowo", "translation_pl": "tłumaczenie zdania"}
4. word_order: {"translation_pl": "tłumaczenie", "words": ["rozsypane","słowa"], "correct_order": ["poprawna","kolejność"]}

WAŻNE:
- Zdania muszą być naturalne i na poziomie ${level}
- Distraktory muszą być wiarygodne ale jednoznacznie błędne
- Treści odpowiednie do nauki języka (codzienne tematy)
- Zdania 4-7 słów

Odpowiedz TYLKO jako JSON array (bez markdown):
[{"word": "...", "translation": "...", "distractors_translations": [...], "distractors_words": [...], "fill_sentence": {...}, "word_order": {...}}]`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    let exerciseData;
    try {
      exerciseData = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to generate exercises" }, { status: 500 });
    }

    // Build exercises with mixed types
    const exercises = selectedWords.map((vocab, i) => {
      const data = exerciseData[i] || exerciseData[0];
      // Cycle through exercise types for variety
      const typeIndex = i % EXERCISE_TYPES.length;
      const type = EXERCISE_TYPES[typeIndex];

      return {
        id: i,
        type,
        vocabulary_id: vocab.id,
        word: vocab.word,
        translation: vocab.translation,
        context: vocab.context_sentence,
        mastery: vocab.mastery_level,
        language: vocab.language,
        distractors_translations: data?.distractors_translations ?? [],
        distractors_words: data?.distractors_words ?? [],
        fill_sentence: data?.fill_sentence ?? null,
        word_order: data?.word_order ?? null,
      };
    });

    // Create session
    const { data: session } = await supabase
      .from("exercise_sessions")
      .insert({
        user_id: user.id,
        language: profile.target_language,
        total_exercises: exercises.length,
        is_challenge: is_challenge ?? false,
      })
      .select("id")
      .single();

    // For matching exercise, group 5 words together
    const matchingGroup = selectedWords.slice(0, 5).map((w) => ({
      word: w.word,
      translation: w.translation,
      vocabulary_id: w.id,
    }));

    return NextResponse.json({
      session_id: session?.id,
      exercises,
      matching_group: matchingGroup,
      total: exercises.length,
    });
  } catch (error) {
    console.error("Exercise generation error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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

    const [{ data: profile }, { data: userData }] = await Promise.all([
      supabase.from("user_profiles").select("target_language, current_level").eq("user_id", user.id).limit(1).single(),
      supabase.from("users").select("native_language").eq("id", user.id).single(),
    ]);

    if (!profile) return NextResponse.json({ error: "No profile" }, { status: 400 });
    const nativeLang = userData?.native_language ?? "en";

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
        message: nativeLang === "pl" ? "Porozmawiaj z tutorem żeby zebrać słówka do ćwiczeń!" : "Talk to your tutor to collect words for exercises!",
        word_count: vocab?.length ?? 0,
      }, { status: 200 });
    }

    // Select 15 words (or less if not enough)
    const selectedWords = vocab.slice(0, Math.min(15, vocab.length));
    const wordList = selectedWords.map((w) => `"${w.word}" (${w.translation})`).join(", ");

    const langNamesEn: Record<string, string> = {
      es: "Spanish", en: "English", no: "Norwegian", fr: "French",
      it: "Italian", sv: "Swedish", de: "German", fi: "Finnish", ko: "Korean",
      pt: "Portuguese", hu: "Hungarian",
    };
    const nativeLangNames: Record<string, string> = {
      pl: "Polish", en: "English", uk: "Ukrainian",
    };
    const lang = langNamesEn[profile.target_language] ?? profile.target_language;
    const nativeName = nativeLangNames[nativeLang] ?? "English";
    const level = is_challenge ? "one level above " + profile.current_level : profile.current_level;

    // Generate exercise data via Claude
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `Generate language exercises (${lang}, level ${level}).
The user's native language is ${nativeName}. All translations must be in ${nativeName}.

Words: ${wordList}

For EACH word generate:
1. distractors_translations: 3 false translations in ${nativeName} (semantically close)
2. distractors_words: 3 false words in ${lang} (similar to original)
3. fill_sentence: sentence with gap {"sentence_with_gap": "... ____ ...", "answer": "word", "translation_pl": "sentence translation in ${nativeName}"}
4. word_order: {"translation_pl": "translation in ${nativeName}", "words": ["scrambled","words"], "correct_order": ["correct","order"]}

IMPORTANT:
- Sentences must be natural and at ${level} level
- Distractors must be plausible but clearly wrong
- Content appropriate for language learning (everyday topics)
- Sentences 4-7 words

Reply ONLY as JSON array (no markdown):
[{"word": "...", "translation": "...", "distractors_translations": [...], "distractors_words": [...], "fill_sentence": {...}, "word_order": {...}}]`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    let exerciseData;
    try {
      exerciseData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Exercise JSON parse error:", parseErr);
      console.error("Raw response:", text.substring(0, 500));
      console.error("Cleaned:", cleaned.substring(0, 500));
      return NextResponse.json({ error: "Failed to generate exercises — invalid AI response" }, { status: 500 });
    }

    // Build exercises with mixed types
    // Shuffle type order for variety, avoid consecutive same type
    const shuffledTypes = [...EXERCISE_TYPES].sort(() => Math.random() - 0.5);
    const exercises = selectedWords.map((vocab, i) => {
      const data = exerciseData[i] || exerciseData[0];
      const type = shuffledTypes[i % shuffledTypes.length];

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

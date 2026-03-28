import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const EXERCISE_TYPES = [
  "flashcard",
  "translate_to_native",
  "translate_to_target",
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
    const selectedWords = vocab.slice(0, Math.min(10, vocab.length));
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
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `You are a JSON generator. Output ONLY a valid JSON array, nothing else. No markdown, no explanation, no preamble.

Task: Generate language exercise data for ${lang} (level: ${level}). User's native language: ${nativeName}.

Words: ${wordList}

For EACH word, create an object with these exact fields:
- "word": the original word in ${lang}
- "translation": the translation in ${nativeName}
- "distractors_translations": array of 3 plausible but wrong translations in ${nativeName}
- "distractors_words": array of 3 similar but wrong words in ${lang}

Rules: distractors must be plausible but wrong. Every field present.

Output the JSON array now:`,
      }],
    });

    // Check if response was truncated
    if (response.stop_reason === "max_tokens") {
      console.error("Exercise generation truncated — hit max_tokens limit");
      return NextResponse.json({ error: "Exercise generation timed out. Please try again." }, { status: 500 });
    }

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";

    // Robust JSON extraction
    let exerciseData;
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
      exerciseData = JSON.parse(cleaned);
    } catch {
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          exerciseData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON array found");
        }
      } catch (parseErr) {
        console.error("Exercise JSON parse error:", parseErr);
        console.error("Raw response:", text.substring(0, 1000));
        return NextResponse.json({ error: "Failed to generate exercises — invalid AI response" }, { status: 500 });
      }
    }

    if (!Array.isArray(exerciseData) || exerciseData.length === 0) {
      console.error("Exercise data not a valid array:", typeof exerciseData);
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
      };
    });

    // Validate: reassign types with missing data
    for (const ex of exercises) {
      if ((!ex.distractors_translations || ex.distractors_translations.length === 0) &&
          ["translate_to_native", "translate_to_target"].includes(ex.type)) {
        ex.type = "flashcard";
      }
    }

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

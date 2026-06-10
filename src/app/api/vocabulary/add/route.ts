import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { word, translation, lesson_id } = await request.json();

    // Resolve language from lesson (if provided) or user's active profile
    let resolvedLanguage = "en";
    if (lesson_id) {
      const { data: lesson } = await supabase.from("lessons").select("language").eq("id", lesson_id).single();
      if (lesson) resolvedLanguage = lesson.language;
    } else {
      const { data: profile } = await supabase.from("user_profiles").select("target_language").eq("user_id", user.id).limit(1).single();
      if (profile) resolvedLanguage = profile.target_language;
    }

    const { error } = await supabase.from("vocabulary").insert({
      user_id: user.id,
      language: resolvedLanguage,
      word,
      translation,
      lesson_id: lesson_id || null,
      context_sentence: null,
    });

    // Unique index on (user_id, language, lower(word)) — on duplicate, bump times_used
    if (error) {
      const { data: existing } = await supabase
        .from("vocabulary")
        .select("id, times_used")
        .eq("user_id", user.id)
        .eq("language", resolvedLanguage)
        .ilike("word", word)
        .limit(1)
        .single();
      if (existing) {
        await supabase
          .from("vocabulary")
          .update({ times_used: (existing.times_used ?? 0) + 1, last_seen_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

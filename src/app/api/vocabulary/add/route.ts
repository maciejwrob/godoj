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

    await supabase.from("vocabulary").insert({
      user_id: user.id,
      language: resolvedLanguage,
      word,
      translation,
      lesson_id: lesson_id || null,
      context_sentence: null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

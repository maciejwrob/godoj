import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { word, translation, language, lesson_id } = await request.json();

    await supabase.from("vocabulary").insert({
      user_id: user.id,
      language,
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

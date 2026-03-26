import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// POST — save feedback
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { lesson_id, transcript } = await request.json();

    // Generate summary via Claude
    let summary = "";
    if (transcript && transcript.length > 20) {
      try {
        const res = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `Podsumuj ten feedback uzytkownika w 3-5 konkretnych punktach po polsku. Skup sie na actionable insights, pomin pochlebstwa.\n\nTranskrypt:\n${transcript}`,
          }],
        });
        summary = res.content[0].type === "text" ? res.content[0].text : "";
      } catch { summary = "Nie udalo sie wygenerowac podsumowania."; }
    }

    const adminDb = createAdminClient();
    const { error } = await adminDb.from("feedback").insert({
      user_id: user.id,
      lesson_id: lesson_id || null,
      transcript: transcript || "",
      summary,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, summary });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET — check if feedback exists for a lesson
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lesson_id");

    if (lessonId) {
      const adminDb = createAdminClient();
      const { data } = await adminDb.from("feedback").select("id").eq("user_id", user.id).eq("lesson_id", lessonId).limit(1).single();
      return NextResponse.json({ exists: !!data });
    }

    // Get last lesson without feedback
    const adminDb = createAdminClient();
    const { data: lastLesson } = await adminDb
      .from("lessons")
      .select("id")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (!lastLesson) return NextResponse.json({ needsFeedback: false });

    const { data: fb } = await adminDb.from("feedback").select("id").eq("lesson_id", lastLesson.id).limit(1).single();
    return NextResponse.json({ needsFeedback: !fb, lessonId: lastLesson.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

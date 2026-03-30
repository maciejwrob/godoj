import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

function countUserMessages(transcript: string): number {
  if (!transcript) return 0;
  return transcript.split("\n").filter((line) => line.startsWith("User:")).length;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookieStore = await cookies();
  const activeChildId = cookieStore.get("godoj_active_child_id")?.value;
  if (!activeChildId) return NextResponse.json({ error: "No active child" }, { status: 400 });

  const { lesson_id, transcript, duration_seconds } = await request.json();

  // Verify lesson belongs to this child/parent
  const { data: lesson } = await supabase
    .from("child_lessons")
    .select("id, topic, language")
    .eq("id", lesson_id)
    .eq("child_id", activeChildId)
    .eq("parent_id", user.id)
    .single();

  if (!lesson) return NextResponse.json({ error: "Lekcja nie znaleziona" }, { status: 404 });

  // Calculate stars based on participation
  const userMsgCount = countUserMessages(transcript ?? "");
  const durationMin = Math.round((duration_seconds ?? 0) / 60);

  let starsEarned = 1;
  let praise = "Brawo!";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content: `Kids language lesson done. Child spoke ${userMsgCount} times. Duration: ${durationMin} min.
Topic: ${lesson.topic}. Language: ${lesson.language}.
Award 1-3 stars based on participation. Give short praise in Polish (max 5 words, fun, energetic).
Reply ONLY valid JSON: {"stars": 1, "praise": "Super!"}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    starsEarned = Math.max(1, Math.min(3, parsed.stars ?? 1));
    praise = parsed.praise ?? "Brawo!";
  } catch {
    // Fallback based on simple heuristic
    if (userMsgCount >= 6) { starsEarned = 3; praise = "Jesteś niesamowity!"; }
    else if (userMsgCount >= 3) { starsEarned = 2; praise = "Świetna robota!"; }
    else { starsEarned = 1; praise = "Dobry start!"; }
  }

  // Update lesson record
  await supabase
    .from("child_lessons")
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: duration_seconds ?? 0,
      stars_earned: starsEarned,
    })
    .eq("id", lesson_id);

  // Update child_profiles: stars, streak, last_activity
  const { data: child } = await supabase
    .from("child_profiles")
    .select("stars_total, current_streak, longest_streak, last_activity_at")
    .eq("id", activeChildId)
    .single();

  if (child) {
    const today = new Date().toISOString().split("T")[0];
    const lastActive = child.last_activity_at
      ? new Date(child.last_activity_at).toISOString().split("T")[0]
      : null;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let newStreak = child.current_streak ?? 0;
    if (lastActive === today) {
      // Already active today — streak stays
    } else if (lastActive === yesterday) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    await supabase
      .from("child_profiles")
      .update({
        stars_total: (child.stars_total ?? 0) + starsEarned,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, child.longest_streak ?? 0),
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeChildId);
  }

  return NextResponse.json({ stars: starsEarned, praise });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { session_id, results } = await request.json();

    // Update mastery levels
    for (const r of results as { vocabulary_id: string; correct: boolean }[]) {
      const { data: vocab } = await supabase
        .from("vocabulary")
        .select("mastery_level")
        .eq("id", r.vocabulary_id)
        .single();

      if (vocab) {
        const newMastery = r.correct
          ? Math.min(5, vocab.mastery_level + 1)
          : Math.max(0, vocab.mastery_level - 1);

        await supabase
          .from("vocabulary")
          .update({ mastery_level: newMastery, last_seen_at: new Date().toISOString() })
          .eq("id", r.vocabulary_id);
      }
    }

    // Complete session
    const correctCount = results.filter((r: { correct: boolean }) => r.correct).length;
    if (session_id) {
      await supabase
        .from("exercise_sessions")
        .update({
          completed_at: new Date().toISOString(),
          correct_count: correctCount,
        })
        .eq("id", session_id);
    }

    // Check achievements
    let newAchievements: { id: string; name_pl: string; icon: string }[] = [];
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/achievements/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: null }),
      });
      if (res.ok) {
        const data = await res.json();
        newAchievements = data.newly_earned ?? [];
      }
    } catch { /* non-critical */ }

    return NextResponse.json({
      correct: correctCount,
      total: results.length,
      new_achievements: newAchievements,
    });
  } catch (error) {
    console.error("Exercise complete error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

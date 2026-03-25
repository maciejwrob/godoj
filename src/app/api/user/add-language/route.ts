import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { target_language, language_variant, current_level, selected_agent_id } = await request.json();

    // Check if profile already exists for this language
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.id)
      .eq("target_language", target_language)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Masz juz profil dla tego jezyka." }, { status: 400 });
    }

    // Create user_profiles row
    const { error } = await supabase
      .from("user_profiles")
      .insert({
        user_id: user.id,
        target_language,
        language_variant: language_variant || null,
        current_level: current_level || "A1",
        selected_agent_id: selected_agent_id || null,
        learning_goals: [],
        interests: [],
        preferred_duration_min: 10,
        preferred_frequency: "3-4x",
        preferred_time: "any",
        reminders_enabled: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ensure streaks row exists
    const adminDb = createAdminClient();
    await adminDb.from("streaks").upsert(
      { user_id: user.id, current_streak: 0, longest_streak: 0, weekly_minutes_goal: 30, weekly_minutes_done: 0 },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

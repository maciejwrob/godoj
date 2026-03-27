import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      display_name,
      native_language,
      ui_language,
      preferred_duration_min,
      preferred_frequency,
      preferred_time,
      reminders_enabled,
      weekly_minutes_goal,
    } = body;

    // Update users table (display_name, native_language, ui_language)
    const userUpdate: Record<string, unknown> = { display_name, native_language };
    if (ui_language) userUpdate.ui_language = ui_language;
    const { error: usersError } = await supabase
      .from("users")
      .update(userUpdate)
      .eq("id", user.id);

    if (usersError) {
      console.error("Users update error:", usersError);
      return NextResponse.json(
        { error: "Nie udalo sie zaktualizowac profilu" },
        { status: 500 }
      );
    }

    // Update user_profiles table (learning preferences)
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        preferred_duration_min,
        preferred_frequency,
        preferred_time,
        reminders_enabled,
      })
      .eq("user_id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return NextResponse.json(
        { error: "Nie udalo sie zaktualizowac preferencji nauki" },
        { status: 500 }
      );
    }

    // Update streaks table (weekly_minutes_goal)
    const { error: streakError } = await supabase
      .from("streaks")
      .update({
        weekly_minutes_goal,
      })
      .eq("user_id", user.id);

    if (streakError) {
      console.error("Streak update error:", streakError);
      return NextResponse.json(
        { error: "Nie udalo sie zaktualizowac celu tygodniowego" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

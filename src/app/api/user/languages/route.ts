import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("target_language, language_variant, current_level, selected_agent_id")
      .eq("user_id", user.id)
      .order("created_at");

    return NextResponse.json({ languages: profiles ?? [] });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

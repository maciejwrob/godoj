import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Active tutors for a language (+optional variant) — used by the onboarding
// voice picker. Returns id, display name and gender only.
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language");
    const variant = searchParams.get("variant");
    if (!language) return NextResponse.json({ agents: [] });

    const { data } = await supabase
      .from("agents_config")
      .select("id, voice_name, gender, variant")
      .eq("language", language)
      .eq("audience", "adult")
      .eq("is_active", true)
      .order("voice_name");

    const agents = (data ?? [])
      .filter((a) => !variant || !a.variant || a.variant === variant)
      .map((a) => ({ id: a.id, name: a.voice_name, gender: a.gender ?? "female" }));

    return NextResponse.json({ agents });
  } catch {
    return NextResponse.json({ agents: [] });
  }
}

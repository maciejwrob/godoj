import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserSubscription } from "@/lib/subscription";

// Language slots per plan: Free/Starter = 1, Pro = 2, Friends & Family = no cap
function maxLanguagesForTier(tier: string, isUnlimited: boolean): number {
  if (isUnlimited) return 99;
  return tier.replace("_yearly", "") === "pro" ? 2 : 1;
}

export async function POST(request: Request) {
  let uiLocale = "pl";
  const m = (pl: string, en: string) => (uiLocale === "en" ? en : pl);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { target_language, language_variant, current_level, selected_agent_id, ui_locale } = await request.json();
    if (ui_locale === "en") uiLocale = "en";

    // Check if profile already exists for this language
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.id)
      .eq("target_language", target_language)
      .single();

    if (existing) {
      return NextResponse.json({ error: m("Masz już profil dla tego języka.", "You already have a profile for this language.") }, { status: 400 });
    }

    // Enforce plan-based language limit
    const [{ count: profileCount }, sub] = await Promise.all([
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      getUserSubscription(user.id, user.email ?? undefined),
    ]);
    const maxLangs = maxLanguagesForTier(sub.tier ?? "free", sub.isUnlimited);
    if ((profileCount ?? 0) >= maxLangs) {
      const isPro = (sub.tier ?? "").replace("_yearly", "") === "pro";
      return NextResponse.json(
        {
          error: isPro
            ? m("Plan Pro obejmuje maksymalnie 2 języki.", "The Pro plan includes up to 2 languages.")
            : m("Twój plan obejmuje 1 język. Przejdź na Pro, aby uczyć się 2 języków.", "Your plan includes 1 language. Upgrade to Pro to learn 2 languages."),
          upgrade: !isPro,
        },
        { status: 403 }
      );
    }

    // Resolve default agent if not provided
    let agentId = selected_agent_id || null;
    if (!agentId) {
      const { data: defaultAgent } = await supabase
        .from("agents_config")
        .select("id")
        .eq("language", target_language)
        .eq("is_active", true)
        .limit(1)
        .single();
      agentId = defaultAgent?.id ?? null;
    }

    // Create user_profiles row
    const { error } = await supabase
      .from("user_profiles")
      .insert({
        user_id: user.id,
        target_language,
        language_variant: language_variant || null,
        current_level: current_level || "A1",
        selected_agent_id: agentId,
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

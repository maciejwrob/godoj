"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type OnboardingData = {
  displayName: string;
  nativeLanguage: string;
  targetLanguage: string;
  languageVariant: string | null;
  currentLevel: string;
  learningGoals: string[];
  interests: string[];
  preferredDurationMin: number;
  preferredFrequency: string;
  preferredTime: string;
  remindersEnabled: boolean;
  selectedAgentId: string | null;
  uiLanguage: string;
};

export async function saveOnboarding(data: OnboardingData) {
  const supabase = await createClient();
  const m = (pl: string, en: string) => (data.uiLanguage === "en" ? en : pl);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: m("Nie jesteś zalogowany.", "You are not logged in.") };
  }

  // Check beta user limit (only count users registered after baseline)
  const adminCheck = createAdminClient();
  const betaLimit = parseInt(process.env.BETA_USER_LIMIT ?? "40", 10);
  const baseline = parseInt(process.env.BETA_BASELINE_USERS ?? "0", 10);
  const { count: currentUsers } = await adminCheck
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("onboarding_complete", true);

  const newUsers = Math.max(0, (currentUsers ?? 0) - baseline);
  if (newUsers >= betaLimit) {
    // Save to waitlist
    await adminCheck.from("waitlist").upsert(
      {
        email: user.email ?? "",
        name: data.displayName,
        language: data.targetLanguage,
        level: data.currentLevel,
        goals: data.learningGoals,
        interests: data.interests,
        ui_language: data.uiLanguage,
      },
      { onConflict: "email" }
    );
    return { success: false, error: "WAITLIST" };
  }

  // Resolve default agent for the target language if not explicitly chosen
  let agentId = data.selectedAgentId;
  if (!agentId) {
    const { data: defaultAgent } = await supabase
      .from("agents_config")
      .select("id")
      .eq("language", data.targetLanguage)
      .eq("is_active", true)
      .limit(1)
      .single();
    agentId = defaultAgent?.id ?? null;
  }

  // Save user profile
  const { error: profileError } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: user.id,
        target_language: data.targetLanguage,
        language_variant: data.languageVariant,
        current_level: data.currentLevel,
        learning_goals: data.learningGoals,
        interests: data.interests,
        preferred_duration_min: data.preferredDurationMin,
        preferred_frequency: data.preferredFrequency,
        preferred_time: data.preferredTime,
        reminders_enabled: data.remindersEnabled,
        selected_agent_id: agentId,
      },
      { onConflict: "user_id,target_language" }
    );

  if (profileError) {
    return { success: false, error: m("Nie udało się zapisać profilu.", "Could not save your profile.") };
  }

  // Update user: mark onboarding complete + save native language + display name
  const { error: userError } = await supabase
    .from("users")
    .update({
      onboarding_complete: true,
      native_language: data.nativeLanguage,
      display_name: data.displayName,
      ui_language: data.uiLanguage,
    })
    .eq("id", user.id);

  if (userError) {
    return { success: false, error: m("Nie udało się zaktualizować profilu.", "Could not update your profile.") };
  }

  // Create streaks row (admin client to bypass RLS)
  const adminDb = createAdminClient();
  await adminDb.from("streaks").upsert(
    {
      user_id: user.id,
      current_streak: 0,
      longest_streak: 0,
      weekly_minutes_goal: 30,
      weekly_minutes_done: 0,
    },
    { onConflict: "user_id" }
  );

  return { success: true as const };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

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
};

export async function saveOnboarding(data: OnboardingData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nie jesteś zalogowany." };
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
        selected_agent_id: data.selectedAgentId,
      },
      { onConflict: "user_id,target_language" }
    );

  if (profileError) {
    return { success: false, error: "Nie udało się zapisać profilu." };
  }

  // Update user: mark onboarding complete + save native language + display name
  const { error: userError } = await supabase
    .from("users")
    .update({
      onboarding_complete: true,
      native_language: data.nativeLanguage,
      display_name: data.displayName,
    })
    .eq("id", user.id);

  if (userError) {
    return { success: false, error: "Nie udało się zaktualizować profilu." };
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

  redirect("/dashboard");
}

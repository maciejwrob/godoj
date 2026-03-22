"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function checkInvitation(email: string) {
  // Use admin client to bypass RLS — user is not authenticated at login
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("invitations")
    .select("id, token, expires_at, accepted_at")
    .eq("email", email.toLowerCase().trim())
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();

  if (error || !data) {
    return { valid: false as const };
  }

  return { valid: true as const, token: data.token };
}

export async function sendMagicLink(email: string) {
  const invitation = await checkInvitation(email);

  if (!invitation.valid) {
    return {
      success: false as const,
      error: "Ta aplikacja jest dostępna tylko dla zaproszonych użytkowników.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.toLowerCase().trim(),
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
    },
  });

  if (error) {
    return {
      success: false as const,
      error: "Nie udało się wysłać linku. Spróbuj ponownie.",
    };
  }

  return { success: true as const };
}

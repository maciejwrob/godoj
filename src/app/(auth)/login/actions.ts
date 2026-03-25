"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function checkInvitation(email: string) {
  const supabase = createAdminClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data } = await supabase
    .from("invitations")
    .select("id, token, accepted_at, expires_at")
    .eq("email", normalizedEmail)
    .limit(1)
    .single();

  if (!data) {
    return { valid: false as const };
  }

  if (!data.accepted_at && new Date(data.expires_at) < new Date()) {
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

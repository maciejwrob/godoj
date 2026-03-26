"use server";

import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(email: string) {
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

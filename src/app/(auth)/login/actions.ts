"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { magicLinkEmail } from "@/lib/email-templates";

export async function sendMagicLink(email: string) {
  const supabase = createAdminClient();
  const normalizedEmail = email.toLowerCase().trim();

  // Generate a magic link without sending Supabase's default email
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: normalizedEmail,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    },
  });

  if (error || !data.properties?.action_link) {
    return {
      success: false as const,
      error: "Failed to send link. Please try again.",
    };
  }

  // Check if user has a native_language preference
  const { data: userData } = await supabase
    .from("users")
    .select("native_language")
    .eq("id", data.user?.id ?? "")
    .single();
  const nativeLang = userData?.native_language ?? null;
  const isPolish = nativeLang === "pl";

  // Send branded email via Resend
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@godoj.co",
    to: normalizedEmail,
    subject: isPolish ? "Zaloguj się do Godoj.co 🎙" : "Log in to Godoj.co 🎙",
    html: magicLinkEmail(data.properties.action_link, nativeLang),
  });

  if (emailError) {
    return {
      success: false as const,
      error: "Failed to send link. Please try again.",
    };
  }

  return { success: true as const };
}

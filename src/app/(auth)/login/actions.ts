"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { magicLinkEmail } from "@/lib/email-templates";

export async function sendMagicLink(email: string, locale?: "pl" | "en") {
  const supabase = createAdminClient();
  const normalizedEmail = email.toLowerCase().trim();

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

  // Use explicit locale if provided, otherwise check DB, fallback to "en"
  let emailLocale = locale ?? null;
  if (!emailLocale) {
    const { data: userData } = await supabase
      .from("users")
      .select("native_language")
      .eq("id", data.user?.id ?? "")
      .single();
    emailLocale = userData?.native_language === "pl" ? "pl" : "en";
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@godoj.co",
    to: normalizedEmail,
    subject: emailLocale === "pl" ? "Zaloguj się do Godoj.co 🎙" : "Log in to Godoj.co 🎙",
    html: magicLinkEmail(data.properties.action_link, emailLocale),
  });

  if (emailError) {
    console.error("[sendMagicLink] Resend error:", emailError);
    return {
      success: false as const,
      error: "Failed to send link. Please try again.",
    };
  }

  return { success: true as const };
}

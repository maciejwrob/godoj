"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { magicLinkEmail } from "@/lib/email-templates";

export async function sendMagicLink(email: string, locale?: "pl" | "en", marketingConsent?: boolean) {
  const supabase = createAdminClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: normalizedEmail,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/processing`,
    },
  });

  if (error || !data.properties?.action_link) {
    return {
      success: false as const,
      error: "Failed to send link. Please try again.",
    };
  }

  // Store marketing consent — opt-in only: a later login with the box
  // unchecked must NOT revoke a previously granted consent.
  if (marketingConsent && data.user?.id) {
    try {
      await supabase.from("users").update({ marketing_consent: true }).eq("id", data.user.id);
    } catch {}
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
  const { data: emailResult, error: emailError } = await resend.emails.send({
    from: `Maciej z Godoj.co <${process.env.RESEND_FROM_EMAIL ?? "maciej@godoj.co"}>`,
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

  // Log magic link event for monitoring
  try {
    const { data: userData } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", data.user?.id ?? "")
      .single();

    await supabase.from("magic_link_events").insert({
      user_id: data.user?.id ?? null,
      email: normalizedEmail,
      name: userData?.display_name ?? null,
      ui_language: emailLocale,
      resend_email_id: emailResult?.id ?? null,
    });
  } catch (err) {
    console.error("[sendMagicLink] Failed to log event:", err);
  }

  return { success: true as const };
}

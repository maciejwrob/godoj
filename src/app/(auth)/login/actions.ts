"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { magicLinkEmail } from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

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

  const normalizedEmail = email.toLowerCase().trim();
  const adminClient = createAdminClient();

  // Generate magic link via Supabase admin API
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
      },
    });

  if (linkError || !linkData?.properties?.action_link) {
    // Fallback: use standard OTP (sends default Supabase email)
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
      },
    });

    if (error) {
      return { success: false as const, error: "Nie udało się wysłać linku. Spróbuj ponownie." };
    }
    return { success: true as const };
  }

  // Send custom email via Resend
  const magicLink = linkData.properties.action_link;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@godoj.co",
      to: normalizedEmail,
      subject: "Zaloguj się do Godoj",
      html: magicLinkEmail(magicLink),
    });
  } catch (emailError) {
    console.error("Resend email error:", emailError);
    return { success: false as const, error: "Nie udało się wysłać emaila." };
  }

  return { success: true as const };
}

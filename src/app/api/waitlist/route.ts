import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { waitlistConfirmationEmail } from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, locale } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = createAdminClient();

    // Check if already on waitlist
    const { data: existing } = await db
      .from("waitlist")
      .select("id")
      .eq("email", cleanEmail)
      .single();

    if (existing) {
      return NextResponse.json({ error: "ALREADY_ON_WAITLIST" }, { status: 409 });
    }

    // Insert into waitlist
    const { error: insertError } = await db.from("waitlist").insert({
      email: cleanEmail,
      ui_language: locale ?? "pl",
    });

    if (insertError) {
      console.error("Waitlist insert error:", insertError);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // Send confirmation email
    try {
      const { subject, html } = waitlistConfirmationEmail(locale);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "maciej@godoj.co",
        to: cleanEmail,
        subject,
        html,
      });
    } catch (emailErr) {
      // Don't fail the request if email fails — user is already on waitlist
      console.error("Waitlist confirmation email error:", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

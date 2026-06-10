import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

function followUpEmail(name: string, lang: "pl" | "en"): { subject: string; text: string } {
  if (lang === "pl") {
    return {
      subject: `${name}, potrzebujesz pomocy z logowaniem?`,
      text: `Cześć ${name},\n\ntu Maciej, twórca Godoj.co. Wysłaliśmy Ci link do zalogowania jakieś 15 minut temu — jeśli jeszcze go nie kliknąłeś, oto co możesz zrobić:\n\n1. Sprawdź folder spam/oferty — link mógł tam trafić\n2. Kliknij przycisk „Zaloguj się do Godoj" w mailu z tematem „Zaloguj się do Godoj.co 🎙"\n3. Jeśli link nie działa — wejdź na godoj.co/login i wyślij nowy\n\nGdyby coś dalej nie działało, po prostu odpisz na tego maila. Czytam każdy i chętnie pomogę.\n\nMaciej\nfounder, Godoj.co`,
    };
  }
  return {
    subject: `${name}, need help logging in?`,
    text: `Hi ${name},\n\nThis is Maciej, founder of Godoj.co. We sent you a login link about 15 minutes ago — if you haven't clicked it yet, here's what you can do:\n\n1. Check your spam/promotions folder — the link might have ended up there\n2. Click the "Log in to Godoj" button in the email with subject "Log in to Godoj.co 🎙"\n3. If the link doesn't work — go to godoj.co/login and request a new one\n\nIf anything still isn't working, just reply to this email. I read every one and I'm happy to help.\n\nMaciej\nfounder, Godoj.co`,
  };
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Find magic links sent >15 min ago, not clicked, no follow-up sent, not bounced, within 24h
  const { data: pendingLinks } = await db
    .from("magic_link_events")
    .select("*")
    .is("clicked_at", null)
    .is("follow_up_sent_at", null)
    .is("bounced_at", null)
    .lt("sent_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .gt("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (!pendingLinks || pendingLinks.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  for (const link of pendingLinks) {
    const lang = (link.ui_language === "en" ? "en" : "pl") as "pl" | "en";
    const name = link.name || (lang === "pl" ? "Hej" : "there");
    const { subject, text } = followUpEmail(name, lang);

    try {
      const { data: emailResult } = await resend.emails.send({
        from: "Maciej <maciej@godoj.co>",
        replyTo: "maciej@godoj.co",
        to: link.email,
        subject,
        text,
      });

      await db.from("magic_link_events")
        .update({
          follow_up_sent_at: new Date().toISOString(),
          follow_up_resend_email_id: emailResult?.id ?? null,
        })
        .eq("id", link.id);

      processed++;
    } catch (err) {
      console.error(`[cron/followup] Failed for ${link.email}:`, err);
    }
  }

  return NextResponse.json({ processed });
}

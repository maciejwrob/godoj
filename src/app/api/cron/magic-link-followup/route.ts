import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

function followUpEmail(name: string, lang: "pl" | "en"): { subject: string; text: string } {
  if (lang === "pl") {
    return {
      subject: `Hej ${name}, link do Godoj — coś nie zadziałało?`,
      text: `Cześć ${name},\n\ntu Maciek — twórca Godoj.co. Widzę, że wysłaliśmy Ci link do zalogowania jakieś 15 minut temu, ale jeszcze go nie kliknąłeś.\n\nZdarza się, że link ląduje w spamie albo coś nie działa. Jeśli masz jakikolwiek problem — po prostu odpisz na tego maila. Czytam każdy.\n\nSerio.\n\nM.\n\n---\nGodoj.co — naucz się języka przez rozmowę`,
    };
  }
  return {
    subject: `Hey ${name}, your Godoj link — did something break?`,
    text: `Hi ${name},\n\nThis is Maciek — the guy behind Godoj.co. I noticed we sent you a login link about 15 minutes ago and you haven't used it yet.\n\nSometimes the link gets eaten by spam filters or something just doesn't work. If anything's broken — just reply to this email. I read every one.\n\nSeriously.\n\nM.\n\n---\nGodoj.co — learn a language by talking`,
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

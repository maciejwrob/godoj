import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@godoj.co",
    to: "maciej.wrob@gmail.com",
    subject: `Logowanie do Godoj.co — ${user.email}`,
    html: `<p><strong>${user.email}</strong> zalogował/a się do Godoj.co</p><p>Data: ${now}</p>`,
  });

  return NextResponse.json({ ok: true });
}

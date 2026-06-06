import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Mark the most recent magic link as clicked (prevents follow-up email)
  const adminDb = createAdminClient();
  await adminDb
    .from("magic_link_events")
    .update({ clicked_at: new Date().toISOString() })
    .eq("email", user.email!.toLowerCase())
    .is("clicked_at", null)
    .order("sent_at", { ascending: false })
    .limit(1);

  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });

  await resend.emails.send({
    from: `Maciej z Godoj.co <${process.env.RESEND_FROM_EMAIL ?? "maciej@godoj.co"}>`,
    to: "maciej.wrob@gmail.com",
    subject: `Logowanie do Godoj.co — ${user.email}`,
    html: `<p><strong>${user.email}</strong> zalogował/a się do Godoj.co</p><p>Data: ${now}</p>`,
  });

  return NextResponse.json({ ok: true });
}

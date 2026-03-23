import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, role, parent_id } = await request.json();

  if (!email || !role) {
    return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  }

  // Generate a unique token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      email,
      role,
      parent_id: parent_id ?? null,
      invited_by: user!.id,
      token,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send invitation email via Resend
  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const registerLink = `${appUrl}/register?token=${token}`;

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: "Zaproszenie do Godoj",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2>Zaproszenie do Godoj</h2>
        <p>Zostałeś zaproszony do aplikacji Godoj — nauki języków z AI.</p>
        <p>Kliknij poniższy link, aby się zarejestrować:</p>
        <p>
          <a href="${registerLink}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px;">
            Zarejestruj się
          </a>
        </p>
        <p style="color: #888; font-size: 14px;">Link jest ważny przez 7 dni.</p>
      </div>
    `,
  });

  if (emailError) {
    return NextResponse.json({ error: emailError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, invitation_id: invitation.id });
}

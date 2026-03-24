import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { invitationEmail } from "@/lib/email-templates";

export async function POST(request: Request) {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, role, parent_id } = await request.json();

  if (!email || !role) {
    return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  }

  // Get admin name for email
  const { data: adminData } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user!.id)
    .single();

  const adminName = adminData?.display_name ?? "Administrator";

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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

  const resend = new Resend(process.env.RESEND_API_KEY);
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?token=${token}`;

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@godoj.co",
    to: email,
    subject: "Zaproszenie do Godoj",
    html: invitationEmail(inviteUrl, adminName),
  });

  if (emailError) {
    return NextResponse.json({ error: emailError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, invitation_id: invitation.id });
}

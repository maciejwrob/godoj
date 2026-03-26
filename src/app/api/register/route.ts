import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  const { token, display_name } = await request.json();

  if (!token || !display_name) {
    return NextResponse.json({ error: "token and display_name are required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Look up invitation by token
  const { data: invitation, error: invError } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (invError || !invitation) {
    return NextResponse.json({ error: "Invalid invitation token" }, { status: 400 });
  }

  if (invitation.accepted_at) {
    return NextResponse.json({ error: "Invitation already accepted" }, { status: 400 });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
  }

  // Create auth user via admin API
  const adminClient = createAdminClient();

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: invitation.email,
    email_confirm: true,
    user_metadata: { display_name },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Mark invitation as accepted
  await adminClient
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  // Update the users table with role, parent_id, and display_name
  await adminClient
    .from("users")
    .update({
      role: invitation.role,
      parent_id: invitation.parent_id ?? null,
      display_name,
    })
    .eq("id", newUser.user.id);

  // Notify admin about new registration
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const now = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@godoj.co",
      to: "maciej.wrob@gmail.com",
      subject: `Nowy użytkownik Godoj.co — ${display_name}`,
      html: `<p><strong>${display_name}</strong> (${invitation.email}) właśnie utworzył konto na Godoj.co</p><p>Rola: ${invitation.role}</p><p>Data: ${now}</p>`,
    });
  } catch {}

  return NextResponse.json({ success: true });
}

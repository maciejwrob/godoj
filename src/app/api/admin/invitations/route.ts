import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ data: invitationsRaw, error }, { data: parentUsers }] = await Promise.all([
    supabase
      .from("invitations")
      .select("id, email, role, parent_id, invited_by, token, accepted_at, expires_at, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("id, display_name")
      .eq("role", "adult"),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invitations = (invitationsRaw ?? []).map((inv: any) => {
    let status: "pending" | "accepted" | "expired" = "pending";
    if (inv.accepted_at) {
      status = "accepted";
    } else if (inv.expires_at && new Date(inv.expires_at) < now) {
      status = "expired";
    }
    return {
      id: inv.id,
      email: inv.email,
      role: inv.role,
      parentId: inv.parent_id ?? null,
      status,
      createdAt: inv.created_at,
    };
  });

  const parents = (parentUsers ?? []).map((u: { id: string; display_name: string }) => ({
    id: u.id,
    displayName: u.display_name ?? "?",
  }));

  return NextResponse.json({ invitations, parents });
}

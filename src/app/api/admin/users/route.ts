import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get users
  const { data: users, error } = await supabase
    .from("users")
    .select("id, display_name, role, is_active, created_at, user_profiles(target_language, current_level)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json([], { status: 200 });

  // Get auth users for emails
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const emailMap = new Map<string, string>();
  for (const u of authData?.users ?? []) {
    emailMap.set(u.id, u.email ?? "");
  }

  // Get lesson stats
  const { data: lessons } = await supabase.from("lessons").select("user_id, started_at").not("ended_at", "is", null);
  const statsMap = new Map<string, { count: number; lastAt: string | null }>();
  for (const l of lessons ?? []) {
    const ex = statsMap.get(l.user_id);
    if (!ex) statsMap.set(l.user_id, { count: 1, lastAt: l.started_at });
    else { ex.count++; if (l.started_at > (ex.lastAt ?? "")) ex.lastAt = l.started_at; }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (users ?? []).map((u: any) => {
    const profiles = Array.isArray(u.user_profiles) ? u.user_profiles : [];
    const langs = profiles.map((p: { target_language: string }) => p.target_language).join(", ");
    const level = profiles[0]?.current_level ?? "-";
    const stats = statsMap.get(u.id);
    return {
      id: u.id,
      displayName: u.display_name ?? "?",
      email: emailMap.get(u.id) ?? "?",
      role: u.role,
      language: langs || "-",
      level,
      lastActivity: stats?.lastAt ?? null,
      lessonsCount: stats?.count ?? 0,
      active: u.is_active ?? true,
    };
  });

  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user_id, updates } = await request.json();
  if (!user_id || !updates) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const allowed = ["role", "is_active", "onboarding_complete"];
  const sanitized: Record<string, unknown> = {};
  for (const k of allowed) { if (k in updates) sanitized[k] = updates[k]; }

  const { error } = await supabase.from("users").update(sanitized).eq("id", user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user_id } = await request.json();
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const admin = createAdminClient();

  // Delete all user data (cascade-safe order)
  const tables = [
    "error_logs",
    "user_achievements",
    "exercise_sessions",
    "feedback",
    "vocabulary",
    "lessons",
    "streaks",
    "user_profiles",
    "users",
  ];

  for (const table of tables) {
    await admin.from(table).delete().eq("user_id", user_id);
  }

  // Delete from auth.users (completely removes the account)
  const { error } = await admin.auth.admin.deleteUser(user_id);
  if (error) {
    console.error("Auth delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get all users joined with user_profiles
  const { data: users, error } = await supabase
    .from("users")
    .select(`
      id, email, display_name, role, is_active, onboarding_complete, created_at,
      user_profiles(target_language, current_level)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get lessons count and last lesson date per user
  const { data: lessonStats } = await supabase
    .from("lessons")
    .select("user_id, started_at");

  const statsMap = new Map<string, { count: number; last_lesson_at: string | null }>();
  for (const lesson of lessonStats ?? []) {
    const existing = statsMap.get(lesson.user_id);
    if (!existing) {
      statsMap.set(lesson.user_id, { count: 1, last_lesson_at: lesson.started_at });
    } else {
      existing.count += 1;
      if (lesson.started_at > (existing.last_lesson_at ?? "")) {
        existing.last_lesson_at = lesson.started_at;
      }
    }
  }

  const enriched = (users ?? []).map((user) => ({
    ...user,
    lessons_count: statsMap.get(user.id)?.count ?? 0,
    last_lesson_at: statsMap.get(user.id)?.last_lesson_at ?? null,
  }));

  return NextResponse.json(enriched);
}

export async function PATCH(request: Request) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user_id, updates } = await request.json();

  if (!user_id || !updates) {
    return NextResponse.json({ error: "user_id and updates are required" }, { status: 400 });
  }

  // Only allow specific fields to be updated
  const allowedFields = ["role", "is_active", "onboarding_complete"];
  const sanitized: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) {
      sanitized[key] = updates[key];
    }
  }

  const { error } = await supabase
    .from("users")
    .update(sanitized)
    .eq("id", user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

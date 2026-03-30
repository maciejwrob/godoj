import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookieStore = await cookies();
  const activeChildId = cookieStore.get("godoj_active_child_id")?.value;
  if (!activeChildId) return NextResponse.json({ error: "No active child" }, { status: 400 });

  // Verify ownership
  const { data: child } = await supabase
    .from("child_profiles")
    .select("stars_total, current_streak, longest_streak, last_activity_at, onboarding_completed")
    .eq("id", activeChildId)
    .eq("parent_id", user.id)
    .single();

  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { count: completedLessons } = await supabase
    .from("child_lessons")
    .select("id", { count: "exact", head: true })
    .eq("child_id", activeChildId)
    .not("ended_at", "is", null);

  return NextResponse.json({
    stars_total: child.stars_total ?? 0,
    current_streak: child.current_streak ?? 0,
    longest_streak: child.longest_streak ?? 0,
    last_activity_at: child.last_activity_at,
    onboarding_completed: child.onboarding_completed,
    completed_lessons: completedLessons ?? 0,
  });
}

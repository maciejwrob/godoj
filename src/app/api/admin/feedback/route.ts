import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: feedbacks } = await supabase
    .from("feedback")
    .select("id, user_id, lesson_id, transcript, summary, created_at, users(display_name), lessons(language, level_at_start)")
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = (feedbacks ?? []).map((fb: any) => {
    const user = Array.isArray(fb.users) ? fb.users[0] : fb.users;
    const lesson = Array.isArray(fb.lessons) ? fb.lessons[0] : fb.lessons;
    return {
      id: fb.id,
      user_id: fb.user_id,
      lesson_id: fb.lesson_id,
      transcript: fb.transcript,
      summary: fb.summary,
      created_at: fb.created_at,
      user_name: user?.display_name ?? "Nieznany",
      language: lesson?.language ?? null,
      level: lesson?.level_at_start ?? null,
    };
  });

  return NextResponse.json({ feedbacks: mapped });
}

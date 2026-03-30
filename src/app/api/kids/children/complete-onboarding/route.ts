import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookieStore = await cookies();
  const activeChildId = cookieStore.get("godoj_active_child_id")?.value;
  if (!activeChildId) return NextResponse.json({ error: "No active child" }, { status: 400 });

  const body = await request.json();
  const { avatar_id } = body;

  const updates: Record<string, unknown> = {
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };
  if (avatar_id) updates.avatar_id = avatar_id;

  const { error } = await supabase
    .from("child_profiles")
    .update(updates)
    .eq("id", activeChildId)
    .eq("parent_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

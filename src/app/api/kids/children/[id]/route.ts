import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateAge } from "@/lib/kids";
import { createHash } from "crypto";

function hashPin(pin: string): string {
  return createHash("sha256").update(`godoj-pin-${pin}`).digest("hex");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: existing } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", id)
    .eq("parent_id", user.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const body = await request.json();
  const { name, theme, target_language, daily_time_limit_min, pin, avatar_id } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (name !== undefined) updates.name = name.trim();
  if (theme !== undefined) {
    if (!["castle", "jungle", "space"].includes(theme)) {
      return NextResponse.json({ error: "Nieprawidłowy motyw" }, { status: 400 });
    }
    updates.theme = theme;
  }
  if (target_language !== undefined) updates.target_language = target_language;
  if (daily_time_limit_min !== undefined) updates.daily_time_limit_min = daily_time_limit_min;
  if (avatar_id !== undefined) updates.avatar_id = avatar_id;
  if (pin !== undefined) {
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN musi mieć 4 cyfry" }, { status: 400 });
    }
    updates.pin_code = hashPin(pin);
  }

  const { data, error } = await supabase
    .from("child_profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: existing } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", id)
    .eq("parent_id", user.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const { error } = await supabase
    .from("child_profiles")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// Helper export for use in verify-pin route
export { calculateAge };

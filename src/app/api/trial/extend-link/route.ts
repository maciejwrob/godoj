import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// One-click trial extension from the goodbye email (no login required —
// the token is a per-user secret from the email link).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const db = createAdminClient();
  const { data: user } = await db
    .from("users")
    .select("id, trial_extension_days")
    .eq("trial_extension_token", token)
    .single();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // One-time only; also skip if user already has a paid subscription
  if (Number(user.trial_extension_days ?? 0) === 0) {
    const { data: sub } = await db
      .from("subscriptions")
      .select("tier_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .neq("tier_id", "free")
      .limit(1)
      .single();

    if (!sub) {
      await db.from("users").update({ trial_extension_days: 7 }).eq("id", user.id);
    }
  }

  return NextResponse.redirect(`${origin}/login?trial_extended=1`);
}

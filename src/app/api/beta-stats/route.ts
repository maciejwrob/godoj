import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const db = createAdminClient();
  const betaLimit = parseInt(process.env.BETA_USER_LIMIT ?? "30", 10);

  const { count } = await db
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("onboarding_complete", true);

  const registered = count ?? 0;
  const remaining = Math.max(0, betaLimit - registered);

  return NextResponse.json({ registered, limit: betaLimit, remaining });
}

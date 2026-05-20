import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const db = createAdminClient();
  const betaLimit = parseInt(process.env.BETA_USER_LIMIT ?? "40", 10);
  const baseline = parseInt(process.env.BETA_BASELINE_USERS ?? "0", 10);

  const { count } = await db
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("onboarding_complete", true);

  const registered = count ?? 0;
  const newUsers = Math.max(0, registered - baseline);
  const remaining = Math.max(0, betaLimit - newUsers);

  return NextResponse.json({ registered: newUsers, limit: betaLimit, remaining });
}

import { requireAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { user_id, minutes } = body as { user_id: string; minutes: number };

  if (!user_id || typeof minutes !== "number" || minutes <= 0) {
    return NextResponse.json(
      { error: "user_id and positive minutes required" },
      { status: 400 }
    );
  }

  // Insert admin adjustment as a topup with amount_pln=0
  const { error } = await supabase.from("subscription_topups").insert({
    user_id,
    minutes_purchased: minutes,
    minutes_remaining: minutes,
    amount_pln: 0,
  });

  if (error) {
    console.error("[admin/adjust-minutes] Error:", error);
    return NextResponse.json({ error: "Failed to adjust minutes" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

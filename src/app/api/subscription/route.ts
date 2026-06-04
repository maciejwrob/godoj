import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserSubscription } from "@/lib/subscription";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getUserSubscription(user.id, user.email ?? undefined);

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("[subscription] Error:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać danych subskrypcji" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserSubscription, TRIAL_EXTENSION_DAYS } from "@/lib/subscription";

// One-time 7-day trial extension (available from the plans page after expiry).
export async function POST(request: Request) {
  let uiLocale = "pl";
  const m = (pl: string, en: string) => (uiLocale === "en" ? en : pl);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (body?.ui_locale === "en") uiLocale = "en";

    const sub = await getUserSubscription(user.id, user.email ?? undefined);
    if (sub.tier !== "free") {
      return NextResponse.json({ error: m("Masz aktywny plan — przedłużenie nie jest potrzebne.", "You have an active plan — no extension needed.") }, { status: 400 });
    }
    if (sub.trialExtensionUsed) {
      return NextResponse.json({ error: m("Przedłużenie zostało już wykorzystane.", "The extension has already been used.") }, { status: 400 });
    }

    const db = createAdminClient();
    const { error } = await db
      .from("users")
      .update({ trial_extension_days: TRIAL_EXTENSION_DAYS })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: m("Nie udało się przedłużyć okresu próbnego.", "Could not extend the trial.") }, { status: 500 });
    }

    return NextResponse.json({ success: true, extended_days: TRIAL_EXTENSION_DAYS });
  } catch {
    return NextResponse.json({ error: m("Wystąpił błąd serwera", "A server error occurred") }, { status: 500 });
  }
}

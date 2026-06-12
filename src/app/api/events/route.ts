import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Batch analytics ingest. Auth required; user_id is taken from the session
// server-side (clients cannot spoof another user). Silent best-effort — the
// client never waits on this.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse(null, { status: 204 });

    const body = await request.json().catch(() => null);
    const events = Array.isArray(body?.events) ? body.events.slice(0, 50) : [];
    if (events.length === 0) return new NextResponse(null, { status: 204 });

    const rows = events
      .filter((e: { event?: unknown }) => typeof e?.event === "string" && (e.event as string).length <= 64)
      .map((e: { event: string; properties?: unknown; path?: unknown; client_ts?: unknown }) => ({
        user_id: user.id,
        event: e.event,
        properties: {
          ...(typeof e.properties === "object" && e.properties !== null ? e.properties : {}),
          ...(typeof e.client_ts === "number" ? { client_ts: e.client_ts } : {}),
        },
        path: typeof e.path === "string" ? e.path.slice(0, 200) : null,
      }));

    if (rows.length > 0) {
      await createAdminClient().from("app_events").insert(rows);
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

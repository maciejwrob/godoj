import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

// Admin: per-user activity timeline (app events + login/IP events).
// Query params: user_id (optional — without it, latest events across all users),
// event (optional filter), limit (default 200, max 500).
export async function GET(request: Request) {
  const { supabase: db, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  const event = searchParams.get("event");
  const limit = Math.min(500, parseInt(searchParams.get("limit") ?? "200", 10) || 200);

  let eventsQuery = db
    .from("app_events")
    .select("id, user_id, event, properties, path, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (userId) eventsQuery = eventsQuery.eq("user_id", userId);
  if (event) eventsQuery = eventsQuery.eq("event", event);

  let authQuery = db
    .from("auth_events")
    .select("id, user_id, ip, country, city, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(userId ? 50 : 100);
  if (userId) authQuery = authQuery.eq("user_id", userId);

  const [{ data: events }, { data: logins }, { data: users }] = await Promise.all([
    eventsQuery,
    authQuery,
    db.from("users").select("id, display_name"),
  ]);

  const names = new Map((users ?? []).map((u) => [u.id, u.display_name]));

  return NextResponse.json({
    events: (events ?? []).map((e) => ({ ...e, display_name: names.get(e.user_id) ?? null })),
    logins: (logins ?? []).map((l) => ({ ...l, display_name: names.get(l.user_id) ?? null })),
  });
}

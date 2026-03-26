import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { DEFAULT_SYSTEM_PROMPT } from "@/config/agent-prompt";

export async function GET(request: Request) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  if (searchParams.get("default") === "true") {
    return NextResponse.json({ prompt: DEFAULT_SYSTEM_PROMPT });
  }

  const { data } = await supabase.from("app_config").select("value").eq("key", "agent_system_prompt").single();
  return NextResponse.json({ prompt: data?.value ?? DEFAULT_SYSTEM_PROMPT });
}

export async function POST(request: Request) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { prompt } = await request.json();
  if (!prompt) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

  await supabase.from("app_config").upsert(
    { key: "agent_system_prompt", value: prompt, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );

  return NextResponse.json({ success: true });
}

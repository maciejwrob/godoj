import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await request.json();
  const { page, error_message, error_context, user_agent } = body;

  if (!page || !error_message) {
    return NextResponse.json({ error: "page and error_message required" }, { status: 400 });
  }

  const { error } = await supabase.from("error_logs").insert({
    user_id: user?.id ?? null,
    email: user?.email ?? null,
    page,
    error_message,
    error_context: error_context ?? {},
    user_agent: user_agent ?? null,
  });

  if (error) {
    console.error("Error logging failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

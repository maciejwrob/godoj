import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FEEDBACK_AGENT_ID = "agent_9401kmmgjzt3ey5bs3ms27ecjw9e";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${FEEDBACK_AGENT_ID}`,
      { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! } }
    );

    if (!res.ok) return NextResponse.json({ error: "Failed to get signed URL" }, { status: 502 });
    const data = await res.json();
    return NextResponse.json({ signed_url: data.signed_url });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

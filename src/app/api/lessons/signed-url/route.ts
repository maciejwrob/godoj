import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lightweight endpoint to get a FRESH ElevenLabs signed URL for an existing
// lesson's agent — used to RESUME after a pause (we fully disconnect on pause
// to stop the agent and ElevenLabs billing). Does NOT create a lesson row or
// run any Claude calls. Signed URLs are single-use, so each resume needs a new one.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { language, agent_id } = await request.json();

    // Resolve the ElevenLabs agent id (by requested agent, else first active for language)
    let { data: agentConfig } = await supabase
      .from("agents_config")
      .select("elevenlabs_agent_id")
      .eq("id", agent_id)
      .single();

    if (!agentConfig?.elevenlabs_agent_id && language) {
      const { data: fallback } = await supabase
        .from("agents_config")
        .select("elevenlabs_agent_id")
        .eq("language", language)
        .eq("is_active", true)
        .limit(1)
        .single();
      agentConfig = fallback;
    }

    if (!agentConfig?.elevenlabs_agent_id) {
      return NextResponse.json({ error: "Agent not found" }, { status: 400 });
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentConfig.elevenlabs_agent_id}`,
      { method: "GET", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Could not get signed URL" }, { status: 502 });
    }

    const { signed_url } = await res.json();
    return NextResponse.json({ signed_url });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

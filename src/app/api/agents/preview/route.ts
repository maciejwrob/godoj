import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export async function POST(request: Request) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { text, agent_id } = await request.json();

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Look up voice_id from agents_config if agent_id is provided
  let voiceId = DEFAULT_VOICE_ID;

  if (agent_id) {
    const { data: agent } = await supabase
      .from("agents_config")
      .select("voice_id")
      .eq("id", agent_id)
      .single();

    if (agent?.voice_id) {
      voiceId = agent.voice_id;
    }
  }

  // Call ElevenLabs TTS API
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `ElevenLabs API error: ${errorText}` },
      { status: response.status }
    );
  }

  const audioBuffer = await response.arrayBuffer();

  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.byteLength.toString(),
    },
  });
}

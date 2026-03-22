import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Default voice IDs for TTS (ElevenLabs multilingual voices)
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"; // Rachel - multilingual

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, language } = await request.json();

    const languageModelIds: Record<string, string> = {
      es: "eleven_multilingual_v2",
      en: "eleven_multilingual_v2",
      no: "eleven_multilingual_v2",
      fr: "eleven_multilingual_v2",
    };

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: languageModelIds[language] ?? "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "TTS generation failed" },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}

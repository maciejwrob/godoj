import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { language, level, note } = await request.json();

    if (!language || language.trim().length < 2) {
      return NextResponse.json({ error: "Language is required" }, { status: 400 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Godoj <notifications@godoj.co>",
      to: "maciej@godoj.co",
      subject: `Language request: ${language.trim()}`,
      text: [
        `User: ${userData?.display_name ?? "Unknown"} (${user.email})`,
        `Language: ${language.trim()}`,
        `Level: ${level || "not specified"}`,
        note ? `Note: ${note}` : "",
      ].filter(Boolean).join("\n"),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Language request error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

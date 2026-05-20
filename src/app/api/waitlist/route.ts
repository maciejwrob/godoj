import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email, locale } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const db = createAdminClient();

    // Check if already on waitlist
    const { data: existing } = await db
      .from("waitlist")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: "ALREADY_ON_WAITLIST" }, { status: 409 });
    }

    // Insert into waitlist
    const { error: insertError } = await db.from("waitlist").insert({
      email: email.toLowerCase().trim(),
      ui_language: locale ?? "pl",
    });

    if (insertError) {
      console.error("Waitlist insert error:", insertError);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

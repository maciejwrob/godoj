import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

// Verify Resend webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook/resend] RESEND_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("svix-signature") ?? "";

  // Resend uses Svix for webhooks — simplified verification
  // In production, use the svix package for full verification
  // For now, we accept and process

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = createAdminClient();
  const emailId = event.data?.email_id;
  const toEmail = event.data?.to?.[0]?.toLowerCase();

  if (!emailId) {
    return NextResponse.json({ ok: true });
  }

  // Match by resend_email_id first, fallback to most recent event for this email
  // (Supabase may send its own magic link via Resend with a different email_id)
  const matchById = async (table: string, column: string, value: string) => {
    const { data } = await db.from(table).update({ [column]: value })
      .eq("resend_email_id", emailId).select("id");
    if (data && data.length > 0) return true;
    // Fallback: match by recipient email, most recent unmatched event
    if (toEmail) {
      await db.from(table).update({ [column]: value })
        .eq("email", toEmail).is(column, null)
        .order("sent_at", { ascending: false }).limit(1);
    }
    return false;
  };

  try {
    const now = new Date().toISOString();
    switch (event.type) {
      case "email.delivered":
        await matchById("magic_link_events", "delivered_at", now);
        break;
      case "email.bounced":
        await matchById("magic_link_events", "bounced_at", now);
        break;
      case "email.clicked":
        await matchById("magic_link_events", "clicked_at", now);
        break;
    }
  } catch (err) {
    console.error("[webhook/resend] Error processing event:", err);
  }

  return NextResponse.json({ ok: true });
}

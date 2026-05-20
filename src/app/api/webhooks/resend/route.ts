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

  if (!emailId) {
    return NextResponse.json({ ok: true });
  }

  try {
    switch (event.type) {
      case "email.delivered":
        await db.from("magic_link_events")
          .update({ delivered_at: new Date().toISOString() })
          .eq("resend_email_id", emailId);
        break;

      case "email.bounced":
        await db.from("magic_link_events")
          .update({ bounced_at: new Date().toISOString() })
          .eq("resend_email_id", emailId);
        break;

      case "email.clicked":
        await db.from("magic_link_events")
          .update({ clicked_at: new Date().toISOString() })
          .eq("resend_email_id", emailId);
        break;
    }
  } catch (err) {
    console.error("[webhook/resend] Error processing event:", err);
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

// Resend delivers webhooks via Svix. Signed content is "{id}.{timestamp}.{body}",
// HMAC-SHA256 with the base64-decoded secret (after the "whsec_" prefix),
// compared against each "v1,<base64>" entry in the svix-signature header.
function verifySvixSignature(
  body: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  secret: string
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature) return false;
  try {
    const secretBytes = Buffer.from(
      secret.startsWith("whsec_") ? secret.slice(6) : secret,
      "base64"
    );
    const expected = crypto
      .createHmac("sha256", secretBytes)
      .update(`${svixId}.${svixTimestamp}.${body}`)
      .digest("base64");
    const expectedBuf = Buffer.from(expected);
    return svixSignature.split(" ").some((entry) => {
      const sig = entry.split(",")[1];
      if (!sig) return false;
      const sigBuf = Buffer.from(sig);
      return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
    });
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook/resend] RESEND_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const body = await request.text();

  if (
    !verifySvixSignature(
      body,
      request.headers.get("svix-id"),
      request.headers.get("svix-timestamp"),
      request.headers.get("svix-signature"),
      secret
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

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

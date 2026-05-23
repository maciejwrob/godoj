import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Webhook } from "svix";

type ResendEvent = {
  type: string;
  data?: { email_id?: string };
};

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook/resend] RESEND_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const body = await request.text();
  const svixHeaders = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let event: ResendEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, svixHeaders) as ResendEvent;
  } catch (err) {
    console.error("[webhook/resend] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
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

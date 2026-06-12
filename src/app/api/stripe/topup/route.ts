import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";

export async function POST(request: Request) {
  let uiLocale = "pl";
  const m = (pl: string, en: string) => (uiLocale === "en" ? en : pl);
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (body?.ui_locale === "en") uiLocale = "en";
    const cur = ["pln", "usd", "eur"].includes(body?.currency) ? body.currency : "pln";
    const priceCol = cur === "usd" ? "stripe_price_id_usd" : cur === "eur" ? "stripe_price_id_eur" : "stripe_price_id";

    // Only allow top-up for paid subscribers
    const db = createAdminClient();
    const { data: sub } = await db
      .from("subscriptions")
      .select("tier_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!sub || sub.tier_id === "free") {
      return NextResponse.json(
        { error: m("Doładowanie dostępne tylko dla płatnych planów", "Top-ups are only available on paid plans") },
        { status: 400 }
      );
    }

    // Look up the top-up price for the chosen currency from DB
    const { data: topupTier } = await db
      .from("subscription_tiers")
      .select(`${priceCol}`)
      .eq("id", "topup")
      .eq("is_active", true)
      .single();

    const topupPriceId = (topupTier as Record<string, string> | null)?.[priceCol];
    if (!topupPriceId) {
      return NextResponse.json(
        { error: m("Doładowanie nie jest jeszcze skonfigurowane", "Top-up is not configured yet") },
        { status: 400 }
      );
    }

    // Get user display name
    const { data: userData } = await db
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .single();

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email!,
      userData?.display_name ?? undefined
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.godoj.co";

    // Create one-time Checkout Session (mode: payment, not subscription)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [
        {
          price: topupPriceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/app/settings/billing?topup=true`,
      cancel_url: `${baseUrl}/app/settings/plans`,
      locale: uiLocale === "en" ? "en" : "pl",
      metadata: {
        type: "topup",
        user_id: user.id,
      },
      // One-time payments don't create invoices by default — enable so the
      // customer gets a proper document
      invoice_creation: { enabled: true },
      tax_id_collection: { enabled: true },
      customer_update: { name: "auto", address: "auto" },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/topup] Error:", error);
    return NextResponse.json(
      { error: m("Nie udało się utworzyć sesji płatności", "Could not create the payment session") },
      { status: 500 }
    );
  }
}

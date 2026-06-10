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

    // Look up the top-up price from DB
    const { data: topupTier } = await db
      .from("subscription_tiers")
      .select("stripe_price_id")
      .eq("id", "topup")
      .eq("is_active", true)
      .single();

    if (!topupTier?.stripe_price_id) {
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
          price: topupTier.stripe_price_id,
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

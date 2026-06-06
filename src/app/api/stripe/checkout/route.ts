import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tier } = await request.json();

    if (!tier || !["starter", "pro", "starter_yearly", "pro_yearly"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const isMonthly = !tier.includes("_yearly");

    // Look up Stripe price ID from DB
    const db = createAdminClient();
    const { data: tierData } = await db
      .from("subscription_tiers")
      .select("stripe_price_id, name_pl")
      .eq("id", tier)
      .eq("is_active", true)
      .single();

    if (!tierData?.stripe_price_id) {
      return NextResponse.json(
        { error: "Plan nie jest jeszcze skonfigurowany" },
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

    // Create Checkout Session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.godoj.co";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [
        {
          price: tierData.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/settings/billing?success=true`,
      cancel_url: `${baseUrl}/pricing`,
      locale: "pl",
      // Auto-apply beta -50% coupon for monthly plans (until 30.06.2026)
      ...(isMonthly && new Date() < new Date("2026-07-01")
        ? { discounts: [{ coupon: "LZfmj9ya" }] }
        : { allow_promotion_codes: true }),
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/checkout] Error:", error);
    return NextResponse.json(
      { error: "Nie udało się utworzyć sesji płatności" },
      { status: 500 }
    );
  }
}

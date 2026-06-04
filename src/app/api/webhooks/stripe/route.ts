import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

// Helper: extract billing period from a subscription object.
// In newer Stripe API versions, current_period_start/end moved to items.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPeriod(sub: any): { start: number; end: number } {
  // Try subscription-level first (older API), then first item
  const item = sub.items?.data?.[0];
  return {
    start: sub.current_period_start ?? item?.current_period_start ?? Math.floor(Date.now() / 1000),
    end: sub.current_period_end ?? item?.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400,
  };
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook/stripe] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook/stripe] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.client_reference_id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!userId || !customerId || !subscriptionId) {
          console.error("[webhook/stripe] Missing data in checkout session", {
            userId,
            customerId,
            subscriptionId,
          });
          break;
        }

        // Fetch the full subscription to get tier info
        const stripeSubscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = stripeSubscription.items.data[0]?.price.id;
        const tier = await getTierByPriceId(db, priceId);

        // Store stripe_customer_id on user
        await db
          .from("users")
          .update({ stripe_customer_id: customerId })
          .eq("id", userId);

        // Upsert subscription (replace any existing active subscription)
        await db
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("user_id", userId)
          .eq("status", "active");

        const period = getPeriod(stripeSubscription);
        await db.from("subscriptions").insert({
          user_id: userId,
          tier_id: tier,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: "active",
          current_period_start: new Date(period.start * 1000).toISOString(),
          current_period_end: new Date(period.end * 1000).toISOString(),
        });

        // Initialize usage for the new period
        const periodStart = new Date(period.start * 1000);
        const periodEnd = new Date(period.end * 1000);
        await db.from("subscription_usage").upsert(
          {
            user_id: userId,
            period_start: periodStart.toISOString().split("T")[0],
            period_end: periodEnd.toISOString().split("T")[0],
            minutes_used: 0,
          },
          { onConflict: "user_id,period_start" }
        );

        console.log(
          `[webhook/stripe] Checkout completed: user=${userId} tier=${tier}`
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = await getTierByPriceId(db, priceId);
        const subPeriod = getPeriod(subscription);

        await db
          .from("subscriptions")
          .update({
            tier_id: tier,
            status: mapStripeStatus(subscription.status),
            current_period_start: new Date(subPeriod.start * 1000).toISOString(),
            current_period_end: new Date(subPeriod.end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        console.log(
          `[webhook/stripe] Subscription updated: ${subscriptionId} -> ${tier} (${subscription.status})`
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        // Get user_id from existing subscription
        const { data: existingSub } = await db
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        // Mark as canceled
        await db
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        // Create a new free tier subscription for the user
        if (existingSub?.user_id) {
          await db.from("subscriptions").insert({
            user_id: existingSub.user_id,
            tier_id: "free",
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          });
        }

        console.log(
          `[webhook/stripe] Subscription canceled: ${subscriptionId}`
        );
        break;
      }

      case "invoice.payment_succeeded": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        // Only handle subscription renewals (not first payment which is handled by checkout.session.completed)
        const invoiceSubId =
          invoice.subscription ??
          invoice.parent?.subscription_details?.subscription;
        if (invoice.billing_reason !== "subscription_cycle" || !invoiceSubId) {
          break;
        }

        const subscriptionId =
          typeof invoiceSubId === "string" ? invoiceSubId : invoiceSubId.id;

        // Get user from subscription
        const { data: sub } = await db
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (sub?.user_id) {
          // Fetch updated period from Stripe
          const stripeSubscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          const renewPeriod = getPeriod(stripeSubscription);
          const periodStart = new Date(renewPeriod.start * 1000);
          const periodEnd = new Date(renewPeriod.end * 1000);

          // Update subscription period
          await db
            .from("subscriptions")
            .update({
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          // Create fresh usage record for new period
          await db.from("subscription_usage").upsert(
            {
              user_id: sub.user_id,
              period_start: periodStart.toISOString().split("T")[0],
              period_end: periodEnd.toISOString().split("T")[0],
              minutes_used: 0,
            },
            { onConflict: "user_id,period_start" }
          );

          console.log(
            `[webhook/stripe] Invoice paid, new period for user=${sub.user_id}`
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const failedInvoice = event.data.object as any;
        const failedSubId =
          failedInvoice.subscription ??
          failedInvoice.parent?.subscription_details?.subscription;
        if (!failedSubId) break;

        const subscriptionId =
          typeof failedSubId === "string" ? failedSubId : failedSubId.id;

        await db
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        console.log(
          `[webhook/stripe] Payment failed for subscription: ${subscriptionId}`
        );
        break;
      }
    }
  } catch (err) {
    console.error("[webhook/stripe] Error processing event:", err);
  }

  return NextResponse.json({ received: true });
}

// Helper: map Stripe subscription status to our simplified status
function mapStripeStatus(
  stripeStatus: string
): "active" | "canceled" | "past_due" | "incomplete" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
      return "canceled";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      return "incomplete";
  }
}

// Helper: find our tier ID by Stripe price ID
async function getTierByPriceId(
  db: ReturnType<typeof createAdminClient>,
  priceId: string
): Promise<string> {
  const { data } = await db
    .from("subscription_tiers")
    .select("id")
    .eq("stripe_price_id", priceId)
    .single();

  return data?.id ?? "starter"; // Default to starter if price not found
}

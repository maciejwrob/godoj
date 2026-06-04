import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Lazy-initialized Stripe client — avoids build-time errors when env var is missing
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
  }
  return _stripe;
}

// Re-export as `stripe` for convenience (getter-based)
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getStripe() as any)[prop];
  },
});

/**
 * Get or create a Stripe customer for a Godoj user.
 * Stores the customer ID on the users table for quick lookup.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  displayName?: string
): Promise<string> {
  const db = createAdminClient();

  // Check if user already has a Stripe customer ID
  const { data: user } = await db
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (user?.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: displayName ?? undefined,
    metadata: { supabase_user_id: userId },
  });

  // Store on users table
  await db
    .from("users")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  return customer.id;
}

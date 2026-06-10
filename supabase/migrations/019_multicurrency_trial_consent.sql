-- Multi-currency pricing (USD/EUR), 14-day trial expiry, marketing consent

-- 1) USD/EUR price ids + display prices on subscription_tiers
ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS price_usd numeric,
  ADD COLUMN IF NOT EXISTS price_eur numeric,
  ADD COLUMN IF NOT EXISTS stripe_price_id_usd text,
  ADD COLUMN IF NOT EXISTS stripe_price_id_eur text;

UPDATE public.subscription_tiers SET price_usd = 24,  price_eur = 20,  stripe_price_id_usd = 'price_1TguutEDUezs7zrxVOlQDjP7', stripe_price_id_eur = 'price_1Tguv8EDUezs7zrxvOAeuJXw' WHERE id = 'starter';
UPDATE public.subscription_tiers SET price_usd = 230, price_eur = 192, stripe_price_id_usd = 'price_1TguuyEDUezs7zrx70oEnMS0', stripe_price_id_eur = 'price_1TguvAEDUezs7zrx1X0icssx' WHERE id = 'starter_yearly';
UPDATE public.subscription_tiers SET price_usd = 48,  price_eur = 40,  stripe_price_id_usd = 'price_1TguuxEDUezs7zrxjAZwNbVl', stripe_price_id_eur = 'price_1Tguv9EDUezs7zrxMKMzOJKz' WHERE id = 'pro';
UPDATE public.subscription_tiers SET price_usd = 460, price_eur = 384, stripe_price_id_usd = 'price_1TguuyEDUezs7zrxoSMGQksU', stripe_price_id_eur = 'price_1TguvAEDUezs7zrx1eo3s5mp' WHERE id = 'pro_yearly';
UPDATE public.subscription_tiers SET price_usd = 7,   price_eur = 7,   stripe_price_id_usd = 'price_1TguvBEDUezs7zrxu4QKnhLq', stripe_price_id_eur = 'price_1TguvCEDUezs7zrxt08BjE2W' WHERE id = 'topup';

-- 2) Trial expiry: 14 days from trial_started_at (+ one-time 7-day extension).
-- ADD COLUMN with DEFAULT backfills existing rows = everyone gets a fresh
-- 14-day window starting at this migration (fair for current beta users).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_extension_days int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false;

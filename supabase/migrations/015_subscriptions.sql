-- Subscription tiers and billing infrastructure

-- Reference table for subscription tiers
create table public.subscription_tiers (
  id text primary key,
  name_pl text not null,
  monthly_minutes int not null,
  price_pln int not null default 0,
  stripe_price_id text,
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  is_active boolean default true,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- Seed tier data (monthly + yearly with 20% discount)
insert into public.subscription_tiers (id, name_pl, monthly_minutes, price_pln, sort_order, billing_interval)
values
  ('free', 'Darmowy', 15, 0, 0, 'month'),
  ('starter', 'Starter', 80, 79, 1, 'month'),
  ('starter_yearly', 'Starter', 80, 759, 1, 'year'),
  ('pro', 'Pro', 150, 149, 2, 'month'),
  ('pro_yearly', 'Pro', 150, 1429, 2, 'year');

-- User subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tier_id text not null references public.subscription_tiers(id) default 'free',
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_subscriptions_user on subscriptions(user_id);
create index idx_subscriptions_stripe_sub on subscriptions(stripe_subscription_id);
create index idx_subscriptions_stripe_cust on subscriptions(stripe_customer_id);

-- Stripe customer ID on users table for quick lookup
alter table public.users add column if not exists stripe_customer_id text;

-- Usage tracking per billing period
create table public.subscription_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  minutes_used decimal not null default 0,
  updated_at timestamptz default now(),
  unique(user_id, period_start)
);

create index idx_sub_usage_user_period on subscription_usage(user_id, period_start);

-- RLS policies
alter table public.subscription_tiers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_usage enable row level security;

-- Everyone can read tiers (they're public reference data)
create policy "Anyone can read tiers" on public.subscription_tiers
  for select using (true);

-- Users can read their own subscription
create policy "Users can read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Users can read their own usage
create policy "Users can read own usage" on public.subscription_usage
  for select using (auth.uid() = user_id);

-- Initialize all existing users with free tier subscription
insert into public.subscriptions (user_id, tier_id, status, current_period_start, current_period_end)
select
  id,
  'free',
  'active',
  now(),
  now() + interval '30 days'
from public.users
on conflict do nothing;

-- Initialize usage tracking for current period
insert into public.subscription_usage (user_id, period_start, period_end, minutes_used)
select
  id,
  current_date,
  current_date + 30,
  0
from public.users
on conflict do nothing;

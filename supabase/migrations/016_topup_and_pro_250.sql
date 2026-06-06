-- Update Pro plans to 250 minutes (was 200)
update public.subscription_tiers set monthly_minutes = 250 where id = 'pro';
update public.subscription_tiers set monthly_minutes = 250 where id = 'pro_yearly';

-- Add top-up tier (one-time purchase, not a subscription)
insert into public.subscription_tiers (id, name_pl, monthly_minutes, price_pln, sort_order, billing_interval, is_active)
values ('topup', 'Doładowanie', 20, 29, 99, 'month', true)
on conflict (id) do update set monthly_minutes = 20, price_pln = 29, is_active = true;

-- Table for tracking top-up purchases
create table if not exists public.subscription_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_session_id text unique,
  minutes_purchased int not null default 20,
  minutes_remaining decimal not null default 20,
  amount_pln int not null default 29,
  purchased_at timestamptz default now()
);

create index if not exists idx_topups_user on subscription_topups(user_id);
create index if not exists idx_topups_stripe on subscription_topups(stripe_session_id);

-- RLS
alter table public.subscription_topups enable row level security;

create policy "Users can read own topups" on public.subscription_topups
  for select using (auth.uid() = user_id);

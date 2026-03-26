-- Error logging table
create table public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  page text not null,
  error_message text not null,
  error_context jsonb default '{}',
  user_agent text,
  created_at timestamptz default now()
);

-- RLS
alter table public.error_logs enable row level security;

-- Only admins can read
create policy "Admins can read error logs"
  on public.error_logs for select
  using (public.is_admin());

-- Anyone authenticated can insert (to log their own errors)
create policy "Authenticated users can log errors"
  on public.error_logs for insert
  with check (auth.role() = 'authenticated');

-- Index for recent errors
create index idx_error_logs_created_at on public.error_logs(created_at desc);

-- Add UI language preference to users table
alter table public.users add column if not exists ui_language text default 'en';

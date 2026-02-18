-- Run this once in Supabase SQL editor.

create table if not exists public.device_layout_profiles (
  profile_key text primary key,
  layout jsonb not null default '{}'::jsonb,
  updated_by uuid null references auth.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_device_layout_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_device_layout_profiles_updated_at on public.device_layout_profiles;

create trigger trg_device_layout_profiles_updated_at
before update on public.device_layout_profiles
for each row
execute function public.touch_device_layout_profiles_updated_at();

-- Run this in Supabase SQL editor once.
create table if not exists public.bookcase_layout (
  id bigint primary key,
  x_percent numeric not null default 50,
  y_percent numeric not null default 76,
  label text not null default 'Enter the bookcase',
  target_path text not null default '/bookcase/inner',
  hotspots jsonb not null default '[
    {"key":"creating","xPercent":24,"yPercent":18,"label":"Books I''m creating","targetPath":"/bookcase/creating"},
    {"key":"recommended","xPercent":74,"yPercent":18,"label":"Books I''d recommend","targetPath":"/bookcase/recommended"}
  ]'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.bookcase_layout
add column if not exists hotspots jsonb not null default '[
  {"key":"creating","xPercent":24,"yPercent":18,"label":"Books I''m creating","targetPath":"/bookcase/creating"},
  {"key":"recommended","xPercent":74,"yPercent":18,"label":"Books I''d recommend","targetPath":"/bookcase/recommended"}
]'::jsonb;

create or replace function public.touch_bookcase_layout_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_bookcase_layout_updated_at on public.bookcase_layout;
create trigger trg_touch_bookcase_layout_updated_at
before update on public.bookcase_layout
for each row
execute procedure public.touch_bookcase_layout_updated_at();

alter table public.bookcase_layout enable row level security;

-- Public read is optional but useful for client-side layout fetches.
drop policy if exists "bookcase_layout_read" on public.bookcase_layout;
create policy "bookcase_layout_read"
on public.bookcase_layout
for select
using (true);

insert into public.bookcase_layout (id)
values (1)
on conflict (id) do nothing;

update public.bookcase_layout
set hotspots = '[
  {"key":"creating","xPercent":24,"yPercent":18,"label":"Books I''m creating","targetPath":"/bookcase/creating"},
  {"key":"recommended","xPercent":74,"yPercent":18,"label":"Books I''d recommend","targetPath":"/bookcase/recommended"}
]'::jsonb
where hotspots is null
   or hotspots = '[]'::jsonb;

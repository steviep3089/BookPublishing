-- Run this once in Supabase SQL editor.
create table if not exists public.bookcase_page_layouts (
  page_key text primary key,
  hotspots jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_bookcase_page_layouts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_bookcase_page_layouts_updated_at on public.bookcase_page_layouts;
create trigger trg_touch_bookcase_page_layouts_updated_at
before update on public.bookcase_page_layouts
for each row
execute procedure public.touch_bookcase_page_layouts_updated_at();

alter table public.bookcase_page_layouts enable row level security;

drop policy if exists "bookcase_page_layouts_read" on public.bookcase_page_layouts;
create policy "bookcase_page_layouts_read"
on public.bookcase_page_layouts
for select
using (true);

insert into public.bookcase_page_layouts (page_key, hotspots)
values
  (
    'creating',
    '[
      {"key":"main","xPercent":26,"yPercent":18,"label":"Add link","targetPath":"/bookcase","fontSizeVw":4.2}
    ]'::jsonb
  ),
  (
    'recommended',
    '[
      {"key":"main","xPercent":74,"yPercent":18,"label":"Add link","targetPath":"/bookcase","fontSizeVw":4.2}
    ]'::jsonb
  )
on conflict (page_key) do nothing;

update public.bookcase_page_layouts
set hotspots = jsonb_build_array(hotspots->0)
where jsonb_typeof(hotspots) = 'array'
  and jsonb_array_length(hotspots) > 1;

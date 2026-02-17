-- Run this once in Supabase SQL editor.
create table if not exists public.bookcase_book_layouts (
  page_key text primary key,
  books jsonb not null default '[]'::jsonb,
  front_templates jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.bookcase_book_layouts
add column if not exists front_templates jsonb not null default '{}'::jsonb;

create or replace function public.touch_bookcase_book_layouts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_bookcase_book_layouts_updated_at on public.bookcase_book_layouts;
create trigger trg_touch_bookcase_book_layouts_updated_at
before update on public.bookcase_book_layouts
for each row
execute procedure public.touch_bookcase_book_layouts_updated_at();

alter table public.bookcase_book_layouts enable row level security;

drop policy if exists "bookcase_book_layouts_read" on public.bookcase_book_layouts;
create policy "bookcase_book_layouts_read"
on public.bookcase_book_layouts
for select
using (true);

insert into public.bookcase_book_layouts (page_key, books)
values
  (
    'creating',
    '[]'::jsonb
  ),
  (
    'recommended',
    '[]'::jsonb
  )
on conflict (page_key) do nothing;

update public.bookcase_book_layouts
set books = '[]'::jsonb
where books is null
   or jsonb_typeof(books) <> 'array';

update public.bookcase_book_layouts
set front_templates = '{}'::jsonb
where front_templates is null
  or jsonb_typeof(front_templates) <> 'object';

-- Optional helper: copy first 8 books from "creating" to "recommended"
-- and normalize each to width=14.67, height=73.59 while keeping position, title and target.
with creating_books as (
  select item.book, item.ord
  from public.bookcase_book_layouts,
       jsonb_array_elements(books) with ordinality as item(book, ord)
  where page_key = 'creating'
), first_eight as (
  select book, ord
  from creating_books
  where ord <= 8
), normalized as (
  select jsonb_agg(
    jsonb_build_object(
      'key', coalesce(book->>'key', 'book-' || ord::text),
      'xPercent', coalesce((book->>'xPercent')::numeric, 7.34 + ((ord - 1) * 12.19)),
      'yPercent', coalesce((book->>'yPercent')::numeric, 63),
      'widthPercent', 14.67,
      'heightPercent', 73.59,
      'label', coalesce(book->>'label', ''),
      'targetPath', coalesce(book->>'targetPath', '/episodes'),
      'spineType', coalesce(book->>'spineType', case when mod(ord, 2) = 1 then 'gold' else 'brown' end),
      'coverImageUrl', coalesce(book->>'coverImageUrl', '')
    )
    order by ord
  ) as books
  from first_eight
), creating_front as (
  select coalesce(front_templates, '{}'::jsonb) as front_templates
  from public.bookcase_book_layouts
  where page_key = 'creating'
  limit 1
)
update public.bookcase_book_layouts r
set books = coalesce(n.books, '[]'::jsonb),
    front_templates = coalesce(cf.front_templates, '{}'::jsonb)
from normalized n
left join creating_front cf on true
where r.page_key = 'recommended';

-- Run this in Supabase SQL editor.
-- If you see a NOTICE about enum value "user" being added, run this same script one more time.

-- 1) Ensure profiles.role exists.
alter table if exists public.profiles
add column if not exists role text;

-- 2) Normalize role column, handling enum/text safely.
do $$
declare
  role_data_type text;
  role_udt_schema text;
  role_udt_name text;
  enum_has_user boolean := false;
begin
  select c.data_type, c.udt_schema, c.udt_name
    into role_data_type, role_udt_schema, role_udt_name
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'profiles'
    and c.column_name = 'role';

  if role_udt_name is null then
    raise notice 'profiles.role column not found.';
    return;
  end if;

  -- Enum role column: ensure enum label "user" exists.
  if role_data_type = 'USER-DEFINED' then
    select exists (
      select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      join pg_enum e on e.enumtypid = t.oid
      where n.nspname = role_udt_schema
        and t.typname = role_udt_name
        and e.enumlabel = 'user'
    )
    into enum_has_user;

    if not enum_has_user then
      execute format(
        'alter type %I.%I add value %L',
        role_udt_schema,
        role_udt_name,
        'user'
      );
      raise notice 'Added enum value "user". Re-run this script once more to apply backfill/default/not-null.';
      return;
    end if;
  end if;

  -- Backfill and normalize old values.
  execute $sql$
    update public.profiles
    set role = 'user'
    where role is null
       or btrim(role::text) = ''
       or lower(role::text) = 'member'
  $sql$;

  -- Enforce default and non-null.
  execute $sql$
    alter table public.profiles
    alter column role set default 'user'
  $sql$;

  execute $sql$
    alter table public.profiles
    alter column role set not null
  $sql$;

  -- Text role columns get check constraint.
  if role_data_type = 'text' then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'profiles_role_check'
    ) then
      execute $sql$
        alter table public.profiles
        add constraint profiles_role_check
        check (lower(role::text) in ('admin', 'user'))
      $sql$;
    end if;
  end if;
end $$;

-- 3) Optional: promote specific users to admin by id.
-- update public.profiles
-- set role = 'admin'
-- where id in ('00000000-0000-0000-0000-000000000000');

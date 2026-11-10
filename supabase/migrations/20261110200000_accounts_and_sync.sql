-- Firechart: accounts, circles, charts and ticks.
--
-- Privacy model in one paragraph: nobody can do anything until they belong to
-- a circle, and joining a circle takes an invite code. Once in, a person has
-- full access to their own rows and no access to anyone else's charts or
-- ticks. (Letting friends read each other's public charts is added with the
-- Friends milestone.) Every table has row-level security switched on, and
-- every privilege is granted explicitly here, so the result is the same
-- whatever defaults a database was created with.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  -- Theme, week start and background choices, synced between a person's devices.
  settings jsonb not null default '{}'::jsonb,
  -- When the person last changed the row, by their device's clock.
  updated_at timestamptz not null default now(),
  -- When the server last stored the row. Devices pull by this.
  synced_at timestamptz not null default now()
);

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create index circle_members_user on public.circle_members (user_id);

create table public.invites (
  code text primary key check (char_length(code) between 8 and 64),
  circle_id uuid not null references public.circles on delete cascade,
  -- The role the person gets on joining.
  role text not null default 'member' check (role in ('owner', 'member')),
  created_by uuid references auth.users on delete set null,
  max_uses integer not null default 1 check (max_uses between 1 and 100),
  uses integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.charts (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  icon text not null check (char_length(icon) <= 40),
  color jsonb not null,
  shape text not null check (shape in ('rounded', 'square', 'dot')),
  heat_mode text not null check (heat_mode in ('streak', 'flat')),
  visibility text not null check (visibility in ('friends', 'private')),
  schedule jsonb not null,
  start_date date not null,
  sort_order double precision not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  -- A deleted chart stays as a marker so the deletion reaches other devices.
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index charts_owner_synced on public.charts (owner_id, synced_at);

-- One row per chart per day. `done = false` records an un-tick.
create table public.entries (
  chart_id uuid not null,
  owner_id uuid not null default auth.uid(),
  day date not null,
  done boolean not null,
  logged_at timestamptz not null,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  primary key (chart_id, day),
  -- A tick can only belong to a chart owned by the same person.
  foreign key (chart_id, owner_id) references public.charts (id, owner_id) on delete cascade
);

create index entries_owner_synced on public.entries (owner_id, synced_at);

-- ---------------------------------------------------------------------------
-- Helpers for the rules below. They run with the definer's rights so they can
-- look at membership without being blocked by the rules they implement.
-- ---------------------------------------------------------------------------

create function private.is_member(uid uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.circle_members m where m.user_id = uid);
$$;

create function private.shares_circle(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.circle_members x
    join public.circle_members y on y.circle_id = x.circle_id
    where x.user_id = a and y.user_id = b
  );
$$;

create function private.owns_circle(uid uuid, circle uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.circle_members m
    where m.user_id = uid and m.circle_id = circle and m.role = 'owner'
  );
$$;

revoke all on function private.is_member(uuid) from public, anon;
revoke all on function private.shares_circle(uuid, uuid) from public, anon;
revoke all on function private.owns_circle(uuid, uuid) from public, anon;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.shares_circle(uuid, uuid) to authenticated;
grant execute on function private.owns_circle(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Last change wins. A change that is older than what is stored arrived late
-- from another device and is ignored. A timestamp from a clock that runs far
-- ahead is pulled back so it cannot win for ever.
create function private.stamp_row() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  if new.updated_at > now() + interval '5 minutes' then
    new.updated_at := now();
  end if;
  new.synced_at := now();
  return new;
end;
$$;

create function private.guard_chart() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- Deleting is final: a device that had not heard of it cannot bring the chart back.
    if old.deleted_at is not null then
      return null;
    end if;
    return new;
  end if;
  -- Syncing sends every change as "insert, or update if it exists", so only a
  -- chart that is really new counts against the limit.
  if not exists (select 1 from public.charts c where c.id = new.id)
    and (select count(*) from public.charts c where c.owner_id = new.owner_id and c.deleted_at is null) >= 100
  then
    raise exception 'A person can have at most 100 charts.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function private.guard_entry() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Local dates can be up to a day ahead of the server's.
  if new.day > (now() at time zone 'utc')::date + 2 or new.day < date '2000-01-01' then
    raise exception 'That day is out of range.' using errcode = '23514';
  end if;
  -- Ticks for a chart that has been deleted are dropped quietly.
  if exists (select 1 from public.charts c where c.id = new.chart_id and c.deleted_at is not null) then
    return null;
  end if;
  return new;
end;
$$;

create function private.drop_ticks_of_deleted_chart() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    delete from public.entries e where e.chart_id = new.id;
  end if;
  return null;
end;
$$;

-- Triggers on one table fire in name order.
create trigger a_guard before insert or update on public.charts
  for each row execute function private.guard_chart();
create trigger b_stamp before insert or update on public.charts
  for each row execute function private.stamp_row();
create trigger c_drop_ticks after update on public.charts
  for each row execute function private.drop_ticks_of_deleted_chart();

create trigger a_guard before insert or update on public.entries
  for each row execute function private.guard_entry();
create trigger b_stamp before insert or update on public.entries
  for each row execute function private.stamp_row();

create trigger b_stamp before insert or update on public.profiles
  for each row execute function private.stamp_row();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.invites enable row level security;
alter table public.charts enable row level security;
alter table public.entries enable row level security;

-- Profiles: your own, and the names of people in your circles.
create policy "read own profile and circle-mates" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_circle((select auth.uid()), id));
create policy "members create their own profile" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()) and private.is_member((select auth.uid())));
create policy "members update their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and private.is_member((select auth.uid())));

-- Circles and membership: visible to members; changed only through functions.
create policy "members read their circles" on public.circles
  for select to authenticated
  using (exists (
    select 1 from public.circle_members m
    where m.circle_id = id and m.user_id = (select auth.uid())
  ));
create policy "members read who is in their circles" on public.circle_members
  for select to authenticated
  using (private.shares_circle((select auth.uid()), user_id));

-- Invites: managed by the circle's owner.
create policy "owners read invites" on public.invites
  for select to authenticated
  using (private.owns_circle((select auth.uid()), circle_id));
create policy "owners create invites" on public.invites
  for insert to authenticated
  with check (
    private.owns_circle((select auth.uid()), circle_id)
    and created_by = (select auth.uid())
    and role = 'member'
    and uses = 0
    and expires_at <= now() + interval '31 days'
  );
create policy "owners delete invites" on public.invites
  for delete to authenticated
  using (private.owns_circle((select auth.uid()), circle_id));

-- Charts and ticks: only the owner, and only while they belong to a circle.
create policy "owners read their charts" on public.charts
  for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "members create their charts" on public.charts
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.is_member((select auth.uid())));
create policy "members update their charts" on public.charts
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and private.is_member((select auth.uid())));

create policy "owners read their ticks" on public.entries
  for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "members create their ticks" on public.entries
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.is_member((select auth.uid())));
create policy "members update their ticks" on public.entries
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and private.is_member((select auth.uid())));

-- ---------------------------------------------------------------------------
-- Privileges. Signed-out visitors get nothing at all.
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.circles, public.circle_members, public.invites, public.charts, public.entries
  from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.circles to authenticated;
grant select on public.circle_members to authenticated;
grant select, insert, delete on public.invites to authenticated;
grant select, insert, update on public.charts to authenticated;
grant select, insert, update on public.entries to authenticated;

-- The service role is for administration and backups; it is never given to the app.
grant all on public.profiles, public.circles, public.circle_members, public.invites, public.charts, public.entries
  to service_role;

-- ---------------------------------------------------------------------------
-- Functions the app calls
-- ---------------------------------------------------------------------------

-- Joins the circle an invite code belongs to and creates the caller's profile.
create function public.redeem_invite(invite_code text, display_name text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  invite public.invites%rowtype;
  clean_name text := btrim(regexp_replace(coalesce(display_name, ''), '\s+', ' ', 'g'));
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if char_length(clean_name) not between 1 and 40 then
    raise exception 'Choose a name of 1 to 40 characters.' using errcode = '22023';
  end if;

  select * into invite from public.invites i where i.code = btrim(invite_code) for update;
  if not found or invite.expires_at < now() or invite.uses >= invite.max_uses then
    raise exception 'That invite code is not valid.' using errcode = '22023';
  end if;

  insert into public.circle_members (circle_id, user_id, role)
  values (invite.circle_id, uid, invite.role)
  on conflict do nothing;
  if found then
    update public.invites i set uses = i.uses + 1 where i.code = invite.code;
  end if;

  -- The profile starts with the oldest possible timestamp, so settings a person
  -- chose on a device before signing up win over this empty row.
  insert into public.profiles (id, display_name, updated_at)
  values (uid, clean_name, 'epoch')
  on conflict (id) do nothing;
end;
$$;

-- Removes the caller's account and, through cascades, everything they own.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  delete from auth.users u where u.id = auth.uid();
end;
$$;

-- A cheap request the keep-alive job makes so a quiet week does not pause the project.
create function public.ping() returns text
language sql stable set search_path = ''
as $$
  select 'ok'::text;
$$;

revoke all on function public.redeem_invite(text, text) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
revoke all on function public.ping() from public;
grant execute on function public.redeem_invite(text, text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.ping() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Background photos: one private folder per person.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backgrounds', 'backgrounds', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "people read their own background" on storage.objects
  for select to authenticated
  using (bucket_id = 'backgrounds' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "members upload their own background" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'backgrounds'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_member((select auth.uid()))
  );
create policy "members replace their own background" on storage.objects
  for update to authenticated
  using (bucket_id = 'backgrounds' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (
    bucket_id = 'backgrounds'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_member((select auth.uid()))
  );
create policy "people delete their own background" on storage.objects
  for delete to authenticated
  using (bucket_id = 'backgrounds' and (storage.foldername(name))[1] = (select auth.uid())::text);

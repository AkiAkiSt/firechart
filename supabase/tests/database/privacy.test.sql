-- Privacy and sync rules, checked against a real database.
--
-- Four people: Ana and Ben join the same circle, Cy signs up but has no
-- invite, and nobody is signed in for the first checks. Run with
-- `npx supabase test db` (needs the local stack, so it runs in CI).

begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

-- Test plumbing: act as a signed-in person. `reset role` returns to the admin.
create schema tests;
grant usage on schema tests to anon, authenticated;
create function tests.become(uid uuid) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
grant execute on function tests.become(uuid) to anon, authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'cy@example.test');

insert into public.circles (id, name) values ('00000000-0000-0000-0000-0000000000c1', 'Test circle');

insert into public.invites (code, circle_id, role, max_uses, expires_at) values
  ('owner-code-1', '00000000-0000-0000-0000-0000000000c1', 'owner', 1, now() + interval '1 day'),
  ('member-code-1', '00000000-0000-0000-0000-0000000000c1', 'member', 2, now() + interval '1 day'),
  ('expired-code-1', '00000000-0000-0000-0000-0000000000c1', 'member', 1, now() - interval '1 minute');

-- ---------------------------------------------------------------------------
-- Nobody signed in
-- ---------------------------------------------------------------------------

set local role anon;

select throws_ok($$ select * from public.charts $$, '42501', null, 'signed-out visitors cannot read charts');
select throws_ok($$ select * from public.entries $$, '42501', null, 'signed-out visitors cannot read ticks');
select throws_ok($$ select * from public.profiles $$, '42501', null, 'signed-out visitors cannot read profiles');
select throws_ok($$ select * from public.invites $$, '42501', null, 'signed-out visitors cannot read invites');
select throws_ok(
  $$ select public.redeem_invite('member-code-1', 'Nobody') $$, '42501', null,
  'signed-out visitors cannot redeem an invite'
);
select is(public.ping(), 'ok', 'the keep-alive ping answers without signing in');

reset role;

-- ---------------------------------------------------------------------------
-- Cy: an account without an invite can do nothing
-- ---------------------------------------------------------------------------

do $$ begin perform tests.become('00000000-0000-0000-0000-00000000000c'); end $$;

select throws_ok(
  $$ insert into public.charts (id, name, icon, color, shape, heat_mode, visibility, schedule, start_date, created_at, updated_at)
     values (gen_random_uuid(), 'Sneaky', 'target', '{"kind":"preset","ramp":"ember"}', 'rounded', 'streak', 'private',
             '{"kind":"daily"}', '2026-11-01', now(), now()) $$,
  '42501', null, 'without a circle you cannot create a chart'
);
select throws_ok(
  $$ insert into public.profiles (id, display_name) values ('00000000-0000-0000-0000-00000000000c', 'Cy') $$,
  '42501', null, 'without a circle you cannot create a profile'
);
select is_empty($$ select * from public.charts $$, 'without a circle you see no charts');
select is_empty($$ select * from public.profiles $$, 'without a circle you see no profiles');
select is_empty($$ select * from public.circles $$, 'without a circle you see no circles');
select is_empty($$ select * from public.circle_members $$, 'without a circle you see no members');
select throws_ok(
  $$ select public.redeem_invite('no-such-code', 'Cy') $$, '22023', 'That invite code is not valid.',
  'an unknown code is refused'
);
select throws_ok(
  $$ select public.redeem_invite('expired-code-1', 'Cy') $$, '22023', 'That invite code is not valid.',
  'an expired code is refused'
);
select throws_ok(
  $$ select public.redeem_invite('member-code-1', '   ') $$, '22023', null,
  'a blank name is refused'
);

reset role;

select is_empty(
  $$ select * from public.circle_members where user_id = '00000000-0000-0000-0000-00000000000c' $$,
  'failed attempts leave no membership behind'
);

-- ---------------------------------------------------------------------------
-- Ana and Ben join
-- ---------------------------------------------------------------------------

do $$ begin perform tests.become('00000000-0000-0000-0000-00000000000a'); end $$;

select lives_ok($$ select public.redeem_invite('owner-code-1', '  Ana   Maria ') $$, 'Ana redeems her invite');
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Ana Maria', 'her name is tidied and stored'
);
select is(
  (select role from public.circle_members where user_id = '00000000-0000-0000-0000-00000000000a'),
  'owner', 'the invite decides her role'
);
select throws_ok(
  $$ select public.redeem_invite('owner-code-1', 'Ana') $$, '22023', 'That invite code is not valid.',
  'a used-up code is refused'
);

do $$ begin perform tests.become('00000000-0000-0000-0000-00000000000b'); end $$;

select lives_ok($$ select public.redeem_invite('member-code-1', 'Ben') $$, 'Ben redeems his invite');
select lives_ok($$ select public.redeem_invite('member-code-1', 'Ben again') $$, 'redeeming twice is harmless');

reset role;

select is(
  (select uses from public.invites where code = 'member-code-1'), 1,
  'a code is only counted once per person'
);
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'Ben', 'redeeming again does not rename him'
);

-- ---------------------------------------------------------------------------
-- Ana's charts and ticks
-- ---------------------------------------------------------------------------

do $$ begin perform tests.become('00000000-0000-0000-0000-00000000000a'); end $$;

select lives_ok(
  $$ insert into public.charts (id, name, icon, color, shape, heat_mode, visibility, schedule, start_date, sort_order, created_at, updated_at)
     values ('00000000-0000-0000-0000-0000000000e1', 'Exercise', 'dumbbell', '{"kind":"preset","ramp":"ember"}', 'rounded',
             'streak', 'friends', '{"kind":"daily"}', '2026-11-01', 1, now(), now()) $$,
  'a member creates a chart'
);
select lives_ok(
  $$ insert into public.entries (chart_id, day, done, logged_at, updated_at) values
       ('00000000-0000-0000-0000-0000000000e1', '2026-11-09', true, now(), now()),
       ('00000000-0000-0000-0000-0000000000e1', '2026-11-10', true, now(), now()) $$,
  'and ticks two days'
);
select is((select count(*) from public.charts), 1::bigint, 'she sees her chart');
select is((select count(*) from public.entries), 2::bigint, 'she sees her ticks');
select is(
  (select owner_id from public.charts where id = '00000000-0000-0000-0000-0000000000e1'),
  '00000000-0000-0000-0000-00000000000a'::uuid, 'the chart is recorded as hers'
);
select isnt_empty($$ select * from public.invites $$, 'the circle owner can see its invites');
select lives_ok(
  $$ insert into public.invites (code, circle_id, created_by, expires_at)
     values ('fresh-code-1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a',
             now() + interval '7 days') $$,
  'the circle owner can create an invite'
);
select throws_ok(
  $$ insert into public.invites (code, circle_id, created_by, role, expires_at)
     values ('fresh-code-2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a',
             'owner', now() + interval '7 days') $$,
  '42501', null, 'but not one that hands out ownership'
);

-- ---------------------------------------------------------------------------
-- Ben is in the same circle and still cannot see or touch Ana's data
-- ---------------------------------------------------------------------------

do $$ begin perform tests.become('00000000-0000-0000-0000-00000000000b'); end $$;

select is_empty($$ select * from public.charts $$, 'a circle-mate cannot read her charts');
select is_empty($$ select * from public.entries $$, 'a circle-mate cannot read her ticks');
select lives_ok(
  $$ update public.charts set name = 'Hacked', updated_at = now() + interval '1 minute'
     where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'an update aimed at her chart matches nothing'
);
select throws_ok(
  $$ insert into public.entries (chart_id, day, done, logged_at, updated_at)
     values ('00000000-0000-0000-0000-0000000000e1', '2026-11-08', true, now(), now()) $$,
  '23503', null, 'he cannot tick her chart as himself'
);
select throws_ok(
  $$ insert into public.entries (chart_id, owner_id, day, done, logged_at, updated_at)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', '2026-11-08', true, now(), now()) $$,
  '42501', null, 'nor by pretending to be her'
);
select throws_ok(
  $$ insert into public.charts (id, owner_id, name, icon, color, shape, heat_mode, visibility, schedule, start_date, created_at, updated_at)
     values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000a', 'Planted', 'target', '{"kind":"preset","ramp":"ember"}',
             'rounded', 'streak', 'friends', '{"kind":"daily"}', '2026-11-01', now(), now()) $$,
  '42501', null, 'he cannot create a chart in her name'
);
select isnt_empty(
  $$ select * from public.profiles where id = '00000000-0000-0000-0000-00000000000a' $$,
  'he can see her name, because they share a circle'
);
select is_empty($$ select * from public.invites $$, 'an ordinary member cannot read invites');
select throws_ok(
  $$ insert into public.invites (code, circle_id, created_by, expires_at)
     values ('bens-code-1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000b',
             now() + interval '7 days') $$,
  '42501', null, 'or create them'
);
select lives_ok(
  $$ update public.profiles set display_name = 'Renamed', updated_at = now() + interval '1 minute'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  'an update aimed at her profile matches nothing'
);

reset role;

select is(
  (select name from public.charts where id = '00000000-0000-0000-0000-0000000000e1'),
  'Exercise', 'her chart is untouched'
);
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Ana Maria', 'her profile is untouched'
);

do $$ begin perform tests.become('00000000-0000-0000-0000-00000000000c'); end $$;

select is_empty($$ select * from public.profiles $$, 'an outsider still sees no profiles');
select is_empty($$ select * from public.charts $$, 'and no charts');

-- ---------------------------------------------------------------------------
-- Last change wins
-- ---------------------------------------------------------------------------

do $$ begin perform tests.become('00000000-0000-0000-0000-00000000000a'); end $$;

update public.charts set name = 'Stale', updated_at = now() - interval '1 day'
  where id = '00000000-0000-0000-0000-0000000000e1';
select is(
  (select name from public.charts where id = '00000000-0000-0000-0000-0000000000e1'),
  'Exercise', 'a change older than the stored one is ignored'
);

update public.charts set name = 'Workout', updated_at = now() + interval '1 second'
  where id = '00000000-0000-0000-0000-0000000000e1';
select is(
  (select name from public.charts where id = '00000000-0000-0000-0000-0000000000e1'),
  'Workout', 'a newer change is applied'
);

insert into public.charts (id, name, icon, color, shape, heat_mode, visibility, schedule, start_date, created_at, updated_at)
  values ('00000000-0000-0000-0000-0000000000e1', 'Late arrival', 'dumbbell', '{"kind":"preset","ramp":"ember"}', 'rounded',
          'streak', 'friends', '{"kind":"daily"}', '2026-11-01', now(), now() - interval '1 hour')
  on conflict (id) do update set name = excluded.name, updated_at = excluded.updated_at;
select is(
  (select name from public.charts where id = '00000000-0000-0000-0000-0000000000e1'),
  'Workout', 'the same holds when syncing sends an insert-or-update'
);

update public.charts set updated_at = now() + interval '2 days'
  where id = '00000000-0000-0000-0000-0000000000e1';
select ok(
  (select updated_at <= now() + interval '5 minutes' from public.charts where id = '00000000-0000-0000-0000-0000000000e1'),
  'a timestamp from a clock running far ahead is pulled back'
);

-- ---------------------------------------------------------------------------
-- Ticks
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.entries (chart_id, day, done, logged_at, updated_at)
     values ('00000000-0000-0000-0000-0000000000e1', current_date + 10, true, now(), now()) $$,
  '23514', null, 'a day far in the future is refused'
);

insert into public.entries (chart_id, day, done, logged_at, updated_at)
  values ('00000000-0000-0000-0000-0000000000e1', '2026-11-10', false, now(), now() + interval '2 seconds')
  on conflict (chart_id, day) do update set done = excluded.done, updated_at = excluded.updated_at;
select is(
  (select done from public.entries where chart_id = '00000000-0000-0000-0000-0000000000e1' and day = '2026-11-10'),
  false, 'un-ticking is stored as a change'
);

-- ---------------------------------------------------------------------------
-- Deleting a chart
-- ---------------------------------------------------------------------------

update public.charts set deleted_at = now(), updated_at = now() + interval '3 seconds'
  where id = '00000000-0000-0000-0000-0000000000e1';
select is(
  (select count(*) from public.entries where chart_id = '00000000-0000-0000-0000-0000000000e1'),
  0::bigint, 'deleting a chart removes its ticks'
);

update public.charts set name = 'Zombie', deleted_at = null, updated_at = now() + interval '4 minutes'
  where id = '00000000-0000-0000-0000-0000000000e1';
select ok(
  (select deleted_at is not null and name = 'Workout' from public.charts where id = '00000000-0000-0000-0000-0000000000e1'),
  'a deleted chart cannot be brought back by a later change'
);

insert into public.entries (chart_id, day, done, logged_at, updated_at)
  values ('00000000-0000-0000-0000-0000000000e1', '2026-11-07', true, now(), now());
select is(
  (select count(*) from public.entries where chart_id = '00000000-0000-0000-0000-0000000000e1'),
  0::bigint, 'ticks for a deleted chart are dropped'
);

-- ---------------------------------------------------------------------------
-- The chart limit
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into public.charts (id, name, icon, color, shape, heat_mode, visibility, schedule, start_date, created_at, updated_at)
     select gen_random_uuid(), 'Chart ' || g, 'target', '{"kind":"preset","ramp":"ember"}', 'rounded', 'streak', 'private',
            '{"kind":"daily"}', '2026-11-01', now(), now()
     from generate_series(1, 99) g $$,
  'ninety-nine charts are fine'
);
select lives_ok(
  $$ insert into public.charts (id, name, icon, color, shape, heat_mode, visibility, schedule, start_date, created_at, updated_at)
     values ('00000000-0000-0000-0000-0000000000e2', 'Number 100', 'target', '{"kind":"preset","ramp":"ember"}', 'rounded',
             'streak', 'private', '{"kind":"daily"}', '2026-11-01', now(), now()) $$,
  'so is the hundredth'
);
select throws_ok(
  $$ insert into public.charts (id, name, icon, color, shape, heat_mode, visibility, schedule, start_date, created_at, updated_at)
     values (gen_random_uuid(), 'One too many', 'target', '{"kind":"preset","ramp":"ember"}', 'rounded', 'streak', 'private',
             '{"kind":"daily"}', '2026-11-01', now(), now()) $$,
  '23514', null, 'the hundred-and-first is refused'
);
select lives_ok(
  $$ insert into public.charts (id, name, icon, color, shape, heat_mode, visibility, schedule, start_date, created_at, updated_at)
     values ('00000000-0000-0000-0000-0000000000e2', 'Renamed at the limit', 'target', '{"kind":"preset","ramp":"ember"}',
             'rounded', 'streak', 'private', '{"kind":"daily"}', '2026-11-01', now(), now() + interval '1 second')
     on conflict (id) do update set name = excluded.name, updated_at = excluded.updated_at $$,
  'but an existing chart can still be changed at the limit'
);
select is(
  (select name from public.charts where id = '00000000-0000-0000-0000-0000000000e2'),
  'Renamed at the limit', 'and the change is stored'
);

-- ---------------------------------------------------------------------------
-- Background photos
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('backgrounds', '00000000-0000-0000-0000-00000000000a/background.jpg') $$,
  'a member can store a background in their own folder'
);

do $$ begin perform tests.become('00000000-0000-0000-0000-00000000000b'); end $$;

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('backgrounds', '00000000-0000-0000-0000-00000000000a/planted.jpg') $$,
  '42501', null, 'nobody else can write into that folder'
);
select is_empty(
  $$ select * from storage.objects where bucket_id = 'backgrounds' $$,
  'or see what is in it'
);

do $$ begin perform tests.become('00000000-0000-0000-0000-00000000000c'); end $$;

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('backgrounds', '00000000-0000-0000-0000-00000000000c/background.jpg') $$,
  '42501', null, 'an account without a circle cannot store a background at all'
);

-- ---------------------------------------------------------------------------
-- Deleting an account
-- ---------------------------------------------------------------------------

do $$ begin perform tests.become('00000000-0000-0000-0000-00000000000b'); end $$;

select lives_ok($$ select public.delete_my_account() $$, 'a person can delete their own account');

reset role;

select is_empty(
  $$ select * from auth.users where id = '00000000-0000-0000-0000-00000000000b' $$,
  'the account is gone'
);
select is_empty(
  $$ select * from public.circle_members where user_id = '00000000-0000-0000-0000-00000000000b' $$,
  'and so is the membership'
);
select is_empty(
  $$ select * from public.profiles where id = '00000000-0000-0000-0000-00000000000b' $$,
  'and the profile'
);
select isnt_empty(
  $$ select * from auth.users where id = '00000000-0000-0000-0000-00000000000a' $$,
  'other accounts are unaffected'
);

select * from finish();

rollback;

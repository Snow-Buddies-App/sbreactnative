-- Behavioural tests for the Snow Buddies schema and its RLS policies.
-- Run against a fresh database after supabase_stub.sql, the migrations and seed.sql.
\set ON_ERROR_STOP 1

create function pg_temp.expect_error(stmt text, expected text) returns void
language plpgsql as $$
begin
  execute stmt;
  raise exception 'expected error containing "%" from: %', expected, stmt;
exception when others then
  if position(expected in sqlerrm) = 0 then
    raise exception 'expected error containing "%", got "%" from: %', expected, sqlerrm, stmt;
  end if;
end;
$$;
grant execute on function pg_temp.expect_error(text, text) to authenticated;

create function pg_temp.assert(ok boolean, msg text) returns void
language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'assertion failed: %', msg; end if;
end;
$$;
grant execute on function pg_temp.assert(boolean, text) to authenticated, anon;

-- Three users: Ava, Ben and Cal. Profiles are created by the sign-up trigger.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ava@example.com', '{"display_name":"Ava"}'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000d', 'dee@example.com', '{"full_name":"Dee Google"}');

select pg_temp.assert((select display_name from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Ava', 'display name from metadata');
select pg_temp.assert((select display_name from profiles where id = '00000000-0000-0000-0000-00000000000b') = 'ben', 'display name from email');
select pg_temp.assert((select display_name from profiles where id = '00000000-0000-0000-0000-00000000000c') = 'Rider', 'short name falls back');
select pg_temp.assert((select display_name from profiles where id = '00000000-0000-0000-0000-00000000000d') = 'Dee Google', 'name from OAuth metadata');

-- Anonymous (signed-out) callers see nothing.
set role anon;
select pg_temp.assert((select count(*) from profiles) = 0, 'anon sees no profiles');
select pg_temp.assert((select count(*) from mountains) = 0, 'anon sees no mountains');
reset role;

set role authenticated;

-- ===== Ava =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update profiles set sport = 'ski', skill_level = 'advanced', home_mountain_id = 1, onboarded = true
 where id = '00000000-0000-0000-0000-00000000000a';
update profiles set display_name = 'Hacked' where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.assert((select display_name from profiles where id = '00000000-0000-0000-0000-00000000000b') = 'ben', 'cannot edit others');

-- Cannot message a non-buddy.
select pg_temp.expect_error($$insert into messages (recipient_id, body) values ('00000000-0000-0000-0000-00000000000b', 'hi')$$, 'row-level security');
-- Cannot send a request pretending to be someone else, or pre-accepted.
select pg_temp.expect_error($$insert into buddy_requests (requester_id, addressee_id) values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b')$$, 'row-level security');
select pg_temp.expect_error($$insert into buddy_requests (addressee_id, status) values ('00000000-0000-0000-0000-00000000000b', 'accepted')$$, 'row-level security');

insert into buddy_requests (addressee_id) values ('00000000-0000-0000-0000-00000000000b');
-- Duplicate in either direction is rejected.
select pg_temp.expect_error($$insert into buddy_requests (addressee_id) values ('00000000-0000-0000-0000-00000000000b')$$, 'duplicate key');
-- Requester cannot accept their own request.
select pg_temp.expect_error($$select accept_buddy_request((select id from buddy_requests limit 1))$$, 'not found');

-- ===== Cal cannot see Ava/Ben's request =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.assert((select count(*) from buddy_requests) = 0, 'outsider cannot see requests');

-- ===== Ben accepts =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect_error($$insert into buddy_requests (addressee_id) values ('00000000-0000-0000-0000-00000000000a')$$, 'duplicate key');
select accept_buddy_request((select id from buddy_requests where addressee_id = '00000000-0000-0000-0000-00000000000b'));
select pg_temp.assert(are_buddies('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b'), 'now buddies');
insert into messages (recipient_id, body) values ('00000000-0000-0000-0000-00000000000a', 'Pow day tomorrow?');
select pg_temp.expect_error($$insert into messages (recipient_id, body) values ('00000000-0000-0000-0000-00000000000a', '   ')$$, 'check constraint');

-- ===== Ava reads and replies =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.assert((select unread_count from get_conversations()) = 1, 'one unread');
select mark_conversation_read('00000000-0000-0000-0000-00000000000b');
select pg_temp.assert((select unread_count from get_conversations()) = 0, 'read after marking');
insert into messages (recipient_id, body) values ('00000000-0000-0000-0000-00000000000b', 'First chair!');
select pg_temp.assert((select last_body from get_conversations()) = 'First chair!', 'latest message wins');

-- ===== Cal cannot read their messages =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.assert((select count(*) from messages) = 0, 'outsider cannot read messages');
select pg_temp.assert((select count(*) from get_conversations()) = 0, 'outsider has no conversations');

-- ===== Trips =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_error($$insert into trips (mountain_id, trip_date, title) values (1, current_date - 1, 'Old trip')$$, 'row-level security');
insert into trips (mountain_id, trip_date, title, max_riders) values (1, current_date + 3, 'Back Bowls lap', 2);
select pg_temp.assert((select count(*) from trip_members) = 1, 'host auto-joined');
-- Host cannot leave their own trip.
delete from trip_members where user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.assert((select count(*) from trip_members) = 1, 'host cannot leave');

-- Cal cannot sign Ben up.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.expect_error($$insert into trip_members (trip_id, user_id) values ((select id from trips limit 1), '00000000-0000-0000-0000-00000000000b')$$, 'row-level security');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into trip_members (trip_id) values ((select id from trips limit 1));
update trips set title = 'Mine now';
select pg_temp.assert((select title from trips limit 1) = 'Back Bowls lap', 'non-host cannot edit trip');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.expect_error($$insert into trip_members (trip_id) values ((select id from trips limit 1))$$, 'full');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
delete from trip_members where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.assert((select count(*) from trip_members) = 1, 'rider can leave');

-- ===== Unfriend stops messaging =====
delete from buddy_requests;
select pg_temp.expect_error($$insert into messages (recipient_id, body) values ('00000000-0000-0000-0000-00000000000a', 'hello?')$$, 'row-level security');

reset role;
select 'ALL RLS TESTS PASSED';

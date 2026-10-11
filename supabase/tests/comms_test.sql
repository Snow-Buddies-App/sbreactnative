-- Tests for map pins, voice notes and calls.
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
create function pg_temp.assert(ok boolean, msg text) returns void
language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'assertion failed: %', msg; end if;
end;
$$;
grant execute on function pg_temp.expect_error(text, text) to authenticated;
grant execute on function pg_temp.assert(boolean, text) to authenticated;

-- Hana and Ivo are buddies; Jo is a buddy of Hana only; Kai is nobody's buddy.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'hana@example.com', '{"display_name":"Hana"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'ivo@example.com', '{"display_name":"Ivo"}'),
  ('00000000-0000-0000-0000-0000000000b3', 'jo@example.com', '{"display_name":"Jo"}'),
  ('00000000-0000-0000-0000-0000000000b4', 'kai@example.com', '{"display_name":"Kai"}');
insert into buddy_requests (requester_id, addressee_id, status) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', 'accepted'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b3', 'accepted');

set role authenticated;

-- ===== Pins =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.expect_error($$select drop_pin('meetup', 'Lunch', null, 39.6, -106.3, now() + interval '2 hours', null, array[]::uuid[])$$, 'at least one buddy');
select pg_temp.expect_error($$select drop_pin('pin', 'Stash', null, 39.6, -106.3, null, null, array['00000000-0000-0000-0000-0000000000b4']::uuid[])$$, 'only share pins with your buddies');
select pg_temp.assert((select count(*) from map_pins) = 0, 'failed drop leaves nothing behind');
select pg_temp.expect_error($$insert into map_pins (title, latitude, longitude) values ('x', 1, 1)$$, 'row-level security');
select pg_temp.expect_error($$select drop_pin('pin', 'Far future', null, 39.6, -106.3, null, now() + interval '8 days', array['00000000-0000-0000-0000-0000000000b2']::uuid[])$$, 'check constraint');

select drop_pin('meetup', 'Eagle''s Nest', 'By the gondola', 39.6, -106.3, now() + interval '2 hours', null,
                array['00000000-0000-0000-0000-0000000000b2']::uuid[]);
select pg_temp.assert((select count(*) from map_pins) = 1, 'owner sees pin');
select pg_temp.assert((select body from messages where kind = 'pin') = '📍 Meet: Eagle''s Nest', 'pin card posted to chat');

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.assert((select count(*) from map_pins) = 1, 'chosen buddy sees pin');
select pg_temp.assert((select count(*) from messages where kind = 'pin' and pin_id is not null) = 1, 'buddy gets pin card');
update map_pins set title = 'Hacked';
delete from map_pins;
select pg_temp.assert((select title from map_pins) = 'Eagle''s Nest', 'viewer cannot edit or delete');

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b3';
select pg_temp.assert((select count(*) from map_pins) = 0, 'buddy not chosen sees nothing');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b4';
select pg_temp.assert((select count(*) from map_pins) = 0, 'outsider sees nothing');

-- Clients can't forge pin or call messages.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.expect_error($$insert into messages (recipient_id, body, kind) values ('00000000-0000-0000-0000-0000000000b1', 'fake', 'pin')$$, 'row-level security');
select pg_temp.expect_error($$insert into messages (recipient_id, body, kind, pin_id) values ('00000000-0000-0000-0000-0000000000b1', 'fake', 'text', (select id from map_pins limit 1))$$, 'row-level security');

-- Expired pins disappear for viewers.
reset role;
update map_pins set expires_at = now() + interval '1 second', created_at = now() - interval '1 hour';
select pg_sleep(1.1);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.assert((select count(*) from map_pins) = 0, 'expired pin hidden from viewer');

-- ===== Voice notes =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('voice-messages', '00000000-0000-0000-0000-0000000000b2/x.m4a')$$, 'row-level security');
insert into storage.objects (bucket_id, name) values ('voice-messages', '00000000-0000-0000-0000-0000000000b1/note1.m4a');
select pg_temp.expect_error($$insert into messages (recipient_id, body, kind, attachment_path) values ('00000000-0000-0000-0000-0000000000b2', '🎤', 'voice', '00000000-0000-0000-0000-0000000000b2/x.m4a')$$, 'row-level security');

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.assert((select count(*) from storage.objects) = 0, 'recipient cannot play before message exists');

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
insert into messages (recipient_id, body, kind, attachment_path, duration_ms)
values ('00000000-0000-0000-0000-0000000000b2', '🎤 Voice message', 'voice', '00000000-0000-0000-0000-0000000000b1/note1.m4a', 4200);

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.assert((select count(*) from storage.objects) = 1, 'recipient can play voice note');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b3';
select pg_temp.assert((select count(*) from storage.objects) = 0, 'others cannot play voice note');

-- ===== Calls =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b4';
select pg_temp.expect_error($$select start_call('00000000-0000-0000-0000-0000000000b1', 'video')$$, 'only call your buddies');
select pg_temp.expect_error($$insert into calls (callee_id, kind) values ('00000000-0000-0000-0000-0000000000b1', 'voice')$$, 'row-level security');

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select start_call('00000000-0000-0000-0000-0000000000b2', 'video');
select pg_temp.assert((select status from calls) = 'ringing', 'call is ringing');
select pg_temp.assert((select body from messages where kind = 'call') = '📹 Video call', 'call logged in chat');
-- Caller cannot answer their own call.
select pg_temp.expect_error($$select answer_call((select id from calls limit 1))$$, 'no longer ringing');

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b3';
select pg_temp.assert((select count(*) from calls) = 0, 'outsider cannot see call');
select end_call((select id from calls limit 1));

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.assert((select status from calls) = 'ringing', 'outsider could not end the call');
select answer_call((select id from calls limit 1));
select pg_temp.assert((select status from calls) = 'active', 'callee answered');
select end_call((select id from calls limit 1));
select pg_temp.assert((select status from calls) = 'ended', 'call ended');

-- Unanswered call becomes missed; declined call is declined.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select start_call('00000000-0000-0000-0000-0000000000b2', 'voice');
select end_call((select id from calls where status = 'ringing'));
select pg_temp.assert((select count(*) from calls where status = 'missed') = 1, 'unanswered call missed');
select start_call('00000000-0000-0000-0000-0000000000b2', 'voice');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select decline_call((select id from calls where status = 'ringing'));
select pg_temp.assert((select count(*) from calls where status = 'declined') = 1, 'call declined');

reset role;
select 'ALL COMMS TESTS PASSED';

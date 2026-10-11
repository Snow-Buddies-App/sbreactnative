-- Behavioural tests for live location sharing.
-- Run after supabase_stub.sql, the migrations and seed.sql.
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

-- Eve and Finn are buddies; Gus is not anyone's buddy.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'eve@example.com', '{"display_name":"Eve"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'finn@example.com', '{"display_name":"Finn"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'gus@example.com', '{"display_name":"Gus"}');
insert into buddy_requests (requester_id, addressee_id, status) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1', 'accepted');

set role authenticated;

-- ===== Eve: nothing is stored until she starts sharing =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select pg_temp.assert(not update_my_location(39.64, -106.37, 5, 90), 'no upload while not sharing');
select pg_temp.assert((select count(*) from live_locations) = 0, 'nothing stored while not sharing');
select pg_temp.expect_error($$select start_location_sharing(0)$$, 'between 1 minute and 12 hours');
select pg_temp.expect_error($$select start_location_sharing(721)$$, 'between 1 minute and 12 hours');
select pg_temp.assert(start_location_sharing(60) > now(), 'sharing started');
select pg_temp.assert(update_my_location(39.64, -106.37, 5, 90), 'upload while sharing');
select pg_temp.assert((select count(*) from live_locations) = 1, 'Eve sees her own location');

-- Direct writes are not allowed, only the RPC.
select pg_temp.expect_error($$insert into live_locations (user_id, latitude, longitude) values ('00000000-0000-0000-0000-0000000000e1', 1, 1)$$, 'row-level security');
-- Can't share with a non-buddy.
select pg_temp.expect_error($$insert into location_shares (viewer_id) values ('00000000-0000-0000-0000-0000000000a1')$$, 'row-level security');

-- ===== Finn: buddy, but Eve hasn't picked him yet =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select pg_temp.assert((select count(*) from live_locations) = 0, 'buddy cannot see without a share');
select pg_temp.assert((select count(*) from location_sharing) = 0, 'sharing session is private');
-- Finn cannot grant himself access or write Eve's position.
select pg_temp.expect_error($$insert into location_shares (owner_id, viewer_id) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1')$$, 'row-level security');
update live_locations set latitude = 0;

-- ===== Eve shares with Finn =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into location_shares (viewer_id) values ('00000000-0000-0000-0000-0000000000f1');
select pg_temp.assert((select latitude from live_locations) = 39.64, 'position untouched by others');

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select pg_temp.assert((select count(*) from live_locations where user_id = '00000000-0000-0000-0000-0000000000e1') = 1, 'Finn sees Eve');
select pg_temp.assert((select count(*) from location_shares) = 1, 'Finn sees the share made to him');
delete from location_shares;

-- ===== Gus sees nothing =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.assert((select count(*) from live_locations) = 0, 'outsider sees nothing');
select pg_temp.assert((select count(*) from location_shares) = 0, 'outsider sees no shares');

-- ===== Expired sessions hide the location =====
reset role;
update location_sharing set sharing_until = now() - interval '1 minute'
 where user_id = '00000000-0000-0000-0000-0000000000e1';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select pg_temp.assert((select count(*) from live_locations) = 0, 'expired sharing is hidden');

-- ===== Eve restarts, then stops: position is deleted =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select start_location_sharing(30);
select update_my_location(39.65, -106.38);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select pg_temp.assert((select count(*) from live_locations) = 1, 'visible again after restart (share persisted)');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select stop_location_sharing();
select pg_temp.assert((select count(*) from live_locations) = 0, 'stopping deletes the position');

-- ===== Revoking a viewer and unfriending =====
select start_location_sharing(30);
select update_my_location(39.65, -106.38);
delete from location_shares where viewer_id = '00000000-0000-0000-0000-0000000000f1';
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select pg_temp.assert((select count(*) from live_locations) = 0, 'revoked viewer loses access');

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into location_shares (viewer_id) values ('00000000-0000-0000-0000-0000000000f1');
delete from buddy_requests;
select pg_temp.assert((select count(*) from location_shares) = 0, 'unfriending removes shares');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select pg_temp.assert((select count(*) from live_locations) = 0, 'ex-buddy sees nothing');

reset role;
select 'ALL LOCATION TESTS PASSED';

-- Live location sharing between buddies.
--
-- Privacy model:
--   * Sharing is off by default and always time-limited (max 12 hours).
--   * The owner picks exactly which buddies can see them (location_shares).
--   * Only the latest position is stored, never a history, and it is deleted
--     when sharing stops.
--   * Positions are written only through update_my_location(), which refuses
--     to store anything while sharing is off.

-- ---------------------------------------------------------------------------
-- Sharing session: is this user sharing, and until when? Private to the owner.
-- ---------------------------------------------------------------------------
create table public.location_sharing (
  user_id uuid primary key default auth.uid()
    references public.profiles (id) on delete cascade,
  sharing_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.location_sharing enable row level security;

create policy "Users read their own sharing session"
  on public.location_sharing for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Who may see whom. The owner adds and removes viewers, who must be buddies.
-- ---------------------------------------------------------------------------
create table public.location_shares (
  owner_id uuid not null default auth.uid()
    constraint location_shares_owner_id_fkey references public.profiles (id) on delete cascade,
  viewer_id uuid not null
    constraint location_shares_viewer_id_fkey references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, viewer_id),
  check (owner_id <> viewer_id)
);

create index location_shares_viewer_idx on public.location_shares (viewer_id);

alter table public.location_shares enable row level security;

create policy "Owners and viewers see their shares"
  on public.location_shares for select to authenticated
  using ((select auth.uid()) in (owner_id, viewer_id));

create policy "Owners share with their buddies"
  on public.location_shares for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.are_buddies(owner_id, viewer_id));

create policy "Owners stop sharing with a viewer"
  on public.location_shares for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Unfriending removes location shares in both directions.
create function public.remove_location_shares_on_unfriend()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.location_shares
   where (owner_id = old.requester_id and viewer_id = old.addressee_id)
      or (owner_id = old.addressee_id and viewer_id = old.requester_id);
  return old;
end;
$$;

create trigger buddy_requests_remove_location_shares
  after delete on public.buddy_requests
  for each row execute function public.remove_location_shares_on_unfriend();

-- ---------------------------------------------------------------------------
-- Latest position per user
-- ---------------------------------------------------------------------------
create table public.live_locations (
  user_id uuid primary key
    constraint live_locations_user_id_fkey references public.profiles (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m real check (accuracy_m >= 0),
  heading real check (heading >= 0 and heading < 360),
  updated_at timestamptz not null default now()
);

alter table public.live_locations enable row level security;

create function public.is_sharing_location(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.location_sharing
     where user_id = owner and sharing_until > now()
  );
$$;

-- Can the current user see `owner` on the map right now?
create function public.can_see_location(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_sharing_location(owner)
     and exists (
       select 1 from public.location_shares
        where owner_id = owner and viewer_id = auth.uid()
     )
     and public.are_buddies(owner, auth.uid());
$$;

create policy "Users see themselves and buddies sharing with them"
  on public.live_locations for select to authenticated
  using (user_id = (select auth.uid()) or public.can_see_location(user_id));

-- No insert/update/delete policies: writes go through the functions below.

create function public.start_location_sharing(duration_minutes integer)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  until timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if duration_minutes is null or duration_minutes < 1 or duration_minutes > 720 then
    raise exception 'Sharing can last between 1 minute and 12 hours';
  end if;
  until := now() + make_interval(mins => duration_minutes);
  insert into public.location_sharing (user_id, sharing_until, updated_at)
  values (auth.uid(), until, now())
  on conflict (user_id) do update
    set sharing_until = excluded.sharing_until, updated_at = now();
  return until;
end;
$$;

create function public.stop_location_sharing()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.location_sharing
     set sharing_until = null, updated_at = now()
   where user_id = auth.uid();
  delete from public.live_locations where user_id = auth.uid();
end;
$$;

-- Store the caller's position. Returns false (and stores nothing) when the
-- caller is not sharing, so a stale background task can't leak a location.
create function public.update_my_location(
  lat double precision,
  lng double precision,
  accuracy double precision default null,
  heading_deg double precision default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if not public.is_sharing_location(auth.uid()) then
    delete from public.live_locations where user_id = auth.uid();
    return false;
  end if;
  insert into public.live_locations (user_id, latitude, longitude, accuracy_m, heading, updated_at)
  values (
    auth.uid(),
    lat,
    lng,
    case when accuracy >= 0 then accuracy end,
    case when heading_deg >= 0 and heading_deg < 360 then heading_deg end,
    now()
  )
  on conflict (user_id) do update
    set latitude = excluded.latitude,
        longitude = excluded.longitude,
        accuracy_m = excluded.accuracy_m,
        heading = excluded.heading,
        updated_at = now();
  return true;
end;
$$;

revoke execute on function public.is_sharing_location(uuid) from public, anon;
revoke execute on function public.can_see_location(uuid) from public, anon;
revoke execute on function public.start_location_sharing(integer) from public, anon;
revoke execute on function public.stop_location_sharing() from public, anon;
revoke execute on function public.update_my_location(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.is_sharing_location(uuid) to authenticated;
grant execute on function public.can_see_location(uuid) to authenticated;
grant execute on function public.start_location_sharing(integer) to authenticated;
grant execute on function public.stop_location_sharing() to authenticated;
grant execute on function public.update_my_location(double precision, double precision, double precision, double precision) to authenticated;

-- Live position updates on the map
alter publication supabase_realtime add table public.live_locations;

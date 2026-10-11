-- Snow Buddies core schema: profiles, mountains, buddies, messages, trips.
-- Every table has row level security enabled; clients only use the anon key.

create type public.sport as enum ('ski', 'snowboard', 'both');
create type public.skill_level as enum ('beginner', 'intermediate', 'advanced', 'expert');
create type public.buddy_status as enum ('pending', 'accepted');

-- ---------------------------------------------------------------------------
-- Mountains (reference data, seeded in seed.sql)
-- ---------------------------------------------------------------------------
create table public.mountains (
  id bigint generated always as identity primary key,
  name text not null unique,
  region text not null,
  country text not null default 'US',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180)
);

alter table public.mountains enable row level security;

create policy "Mountains are readable by signed-in users"
  on public.mountains for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users, created by trigger on sign-up)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  sport public.sport,
  skill_level public.skill_level,
  home_mountain_id bigint references public.mountains (id) on delete set null,
  bio text check (char_length(bio) <= 280),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_home_mountain_idx on public.profiles (home_mountain_id);

alter table public.profiles enable row level security;

create policy "Profiles are readable by signed-in users"
  on public.profiles for select to authenticated using (true);

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text := left(trim(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    -- Google / Facebook sign-in
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  )), 40);
begin
  if char_length(name) < 2 then
    name := 'Rider';
  end if;
  insert into public.profiles (id, display_name) values (new.id, name);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Buddy requests. A declined request is deleted, so the pair can try again.
-- ---------------------------------------------------------------------------
create table public.buddy_requests (
  id bigint generated always as identity primary key,
  requester_id uuid not null default auth.uid()
    constraint buddy_requests_requester_id_fkey references public.profiles (id) on delete cascade,
  addressee_id uuid not null
    constraint buddy_requests_addressee_id_fkey references public.profiles (id) on delete cascade,
  status public.buddy_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

create unique index buddy_requests_pair_idx on public.buddy_requests (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);
create index buddy_requests_addressee_idx on public.buddy_requests (addressee_id);

alter table public.buddy_requests enable row level security;

create policy "Users see requests they are part of"
  on public.buddy_requests for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "Users send pending requests as themselves"
  on public.buddy_requests for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');

create policy "Either side can cancel, decline or unfriend"
  on public.buddy_requests for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Only the addressee may accept, and only through this function.
create function public.accept_buddy_request(request_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.buddy_requests
     set status = 'accepted', responded_at = now()
   where id = request_id
     and addressee_id = auth.uid()
     and status = 'pending';
  if not found then
    raise exception 'Buddy request not found';
  end if;
end;
$$;

create function public.are_buddies(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.buddy_requests
     where status = 'accepted'
       and least(requester_id, addressee_id) = least(a, b)
       and greatest(requester_id, addressee_id) = greatest(a, b)
  );
$$;

-- ---------------------------------------------------------------------------
-- Direct messages between buddies
-- ---------------------------------------------------------------------------
create table public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null default auth.uid()
    constraint messages_sender_id_fkey references public.profiles (id) on delete cascade,
  recipient_id uuid not null
    constraint messages_recipient_id_fkey references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index messages_sender_recipient_idx on public.messages (sender_id, recipient_id, created_at desc);
create index messages_recipient_sender_idx on public.messages (recipient_id, sender_id, created_at desc);

alter table public.messages enable row level security;

create policy "Users read their own conversations"
  on public.messages for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

create policy "Users message their buddies"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and read_at is null
    and public.are_buddies(sender_id, recipient_id)
  );

create function public.mark_conversation_read(other_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.messages
     set read_at = now()
   where recipient_id = auth.uid()
     and sender_id = other_id
     and read_at is null;
$$;

create function public.get_conversations()
returns table (
  buddy_id uuid,
  display_name text,
  last_body text,
  last_at timestamptz,
  last_sender_id uuid,
  unread_count bigint
)
language sql
stable
set search_path = ''
as $$
  with mine as (
    select m.*,
           case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end as other_id
      from public.messages m
     where auth.uid() in (m.sender_id, m.recipient_id)
  ),
  latest as (
    select distinct on (other_id) other_id, body, created_at, sender_id
      from mine
     order by other_id, created_at desc, id desc
  )
  select l.other_id,
         p.display_name,
         l.body,
         l.created_at,
         l.sender_id,
         (select count(*) from mine u
           where u.other_id = l.other_id
             and u.recipient_id = auth.uid()
             and u.read_at is null)
    from latest l
    join public.profiles p on p.id = l.other_id
   order by l.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Trips: a ride day at a mountain that buddies (or anyone) can join
-- ---------------------------------------------------------------------------
create table public.trips (
  id bigint generated always as identity primary key,
  host_id uuid not null default auth.uid()
    constraint trips_host_id_fkey references public.profiles (id) on delete cascade,
  mountain_id bigint not null references public.mountains (id),
  trip_date date not null,
  title text not null check (char_length(trim(title)) between 3 and 80),
  notes text check (char_length(notes) <= 500),
  min_skill public.skill_level,
  max_riders integer not null default 6 check (max_riders between 2 and 20),
  created_at timestamptz not null default now()
);

create index trips_date_idx on public.trips (trip_date);
create index trips_mountain_idx on public.trips (mountain_id, trip_date);

alter table public.trips enable row level security;

create policy "Trips are readable by signed-in users"
  on public.trips for select to authenticated using (true);

create policy "Users host upcoming trips"
  on public.trips for insert to authenticated
  with check (host_id = (select auth.uid()) and trip_date >= current_date);

create policy "Hosts update their trips"
  on public.trips for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

create policy "Hosts delete their trips"
  on public.trips for delete to authenticated
  using (host_id = (select auth.uid()));

create table public.trip_members (
  trip_id bigint not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid()
    constraint trip_members_user_id_fkey references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index trip_members_user_idx on public.trip_members (user_id);

alter table public.trip_members enable row level security;

create policy "Trip members are readable by signed-in users"
  on public.trip_members for select to authenticated using (true);

create policy "Users join trips as themselves"
  on public.trip_members for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Riders leave trips they do not host"
  on public.trip_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    and not exists (
      select 1 from public.trips t where t.id = trip_id and t.host_id = user_id
    )
  );

-- Enforce capacity and date when joining. The row lock on the trip
-- serialises concurrent joins so max_riders cannot be exceeded.
create function public.check_trip_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trip public.trips%rowtype;
begin
  select * into trip from public.trips where id = new.trip_id for update;
  if not found then
    raise exception 'Trip not found';
  end if;
  if trip.trip_date < current_date then
    raise exception 'This trip has already happened';
  end if;
  if (select count(*) from public.trip_members where trip_id = new.trip_id) >= trip.max_riders then
    raise exception 'This trip is full';
  end if;
  return new;
end;
$$;

create trigger trip_members_check_capacity
  before insert on public.trip_members
  for each row execute function public.check_trip_capacity();

create function public.add_host_to_trip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trip_members (trip_id, user_id) values (new.id, new.host_id);
  return new;
end;
$$;

create trigger trips_add_host
  after insert on public.trips
  for each row execute function public.add_host_to_trip();

-- ---------------------------------------------------------------------------
-- Function privileges: only signed-in users may call the RPCs
-- ---------------------------------------------------------------------------
revoke execute on function public.accept_buddy_request(bigint) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
revoke execute on function public.get_conversations() from public, anon;
revoke execute on function public.are_buddies(uuid, uuid) from public, anon;
grant execute on function public.accept_buddy_request(bigint) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.get_conversations() to authenticated;
grant execute on function public.are_buddies(uuid, uuid) to authenticated;

-- Live chat updates
alter publication supabase_realtime add table public.messages;

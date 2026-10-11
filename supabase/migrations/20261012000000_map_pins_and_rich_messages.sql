-- Map pins and meetup points shared with chosen buddies, plus richer chat
-- messages (voice notes, pin cards, call records).

-- ---------------------------------------------------------------------------
-- Message kinds. `body` stays required: for non-text messages it holds a short
-- summary ("🎤 Voice message", "📍 Meet: Eagle's Nest") used in previews.
-- ---------------------------------------------------------------------------
create type public.message_kind as enum ('text', 'voice', 'pin', 'call');

alter table public.messages
  add column kind public.message_kind not null default 'text',
  add column attachment_path text,
  add column duration_ms integer check (duration_ms between 0 and 600000);

-- ---------------------------------------------------------------------------
-- Pins
-- ---------------------------------------------------------------------------
create type public.pin_kind as enum ('meetup', 'pin');

create table public.map_pins (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid()
    constraint map_pins_owner_id_fkey references public.profiles (id) on delete cascade,
  kind public.pin_kind not null default 'pin',
  title text not null check (char_length(trim(title)) between 1 and 60),
  note text check (char_length(note) <= 280),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  meet_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  check (expires_at > created_at and expires_at <= created_at + interval '7 days')
);

create index map_pins_owner_idx on public.map_pins (owner_id);
create index map_pins_expires_idx on public.map_pins (expires_at);

create table public.pin_shares (
  pin_id bigint not null references public.map_pins (id) on delete cascade,
  viewer_id uuid not null
    constraint pin_shares_viewer_id_fkey references public.profiles (id) on delete cascade,
  primary key (pin_id, viewer_id)
);

create index pin_shares_viewer_idx on public.pin_shares (viewer_id);

alter table public.messages
  add column pin_id bigint references public.map_pins (id) on delete set null;

-- Helpers are security definer so the two tables' policies don't recurse.
create function public.can_see_pin(pin bigint, owner uuid, expires timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select owner = auth.uid()
      or (
        expires > now()
        and exists (select 1 from public.pin_shares where pin_id = pin and viewer_id = auth.uid())
        and public.are_buddies(owner, auth.uid())
      );
$$;

create function public.owns_pin(pin bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.map_pins where id = pin and owner_id = auth.uid());
$$;

alter table public.map_pins enable row level security;
alter table public.pin_shares enable row level security;

create policy "Owners and chosen buddies see pins"
  on public.map_pins for select to authenticated
  using (public.can_see_pin(id, owner_id, expires_at));

create policy "Owners edit their pins"
  on public.map_pins for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners delete their pins"
  on public.map_pins for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "Owners and viewers see pin shares"
  on public.pin_shares for select to authenticated
  using (viewer_id = (select auth.uid()) or public.owns_pin(pin_id));

create policy "Owners remove viewers from their pins"
  on public.pin_shares for delete to authenticated
  using (public.owns_pin(pin_id));

-- Pins are created (and shared) only through drop_pin(), so the pin, its
-- viewers and the optional chat cards are written together.
create function public.drop_pin(
  pin_kind public.pin_kind,
  pin_title text,
  pin_note text,
  lat double precision,
  lng double precision,
  meet_time timestamptz,
  expires timestamptz,
  viewer_ids uuid[],
  post_in_chat boolean default true
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_id bigint;
  viewer uuid;
  summary text;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  if coalesce(array_length(viewer_ids, 1), 0) = 0 then
    raise exception 'Choose at least one buddy to share with';
  end if;

  insert into public.map_pins (owner_id, kind, title, note, latitude, longitude, meet_at, expires_at)
  values (me, pin_kind, trim(pin_title), nullif(trim(pin_note), ''), lat, lng, meet_time,
          coalesce(expires, now() + interval '24 hours'))
  returning id into new_id;

  summary := case when pin_kind = 'meetup' then '📍 Meet: ' else '📍 Pin: ' end || trim(pin_title);

  foreach viewer in array viewer_ids loop
    if not public.are_buddies(me, viewer) then
      raise exception 'You can only share pins with your buddies';
    end if;
    insert into public.pin_shares (pin_id, viewer_id) values (new_id, viewer)
    on conflict do nothing;
    if post_in_chat then
      insert into public.messages (sender_id, recipient_id, body, kind, pin_id)
      values (me, viewer, summary, 'pin', new_id);
    end if;
  end loop;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tighten direct message inserts: clients may send text and voice messages;
-- pin and call messages are only created by drop_pin() / start_call().
-- ---------------------------------------------------------------------------
drop policy "Users message their buddies" on public.messages;

create policy "Users message their buddies"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and read_at is null
    and public.are_buddies(sender_id, recipient_id)
    and pin_id is null
    and (
      (kind = 'text' and attachment_path is null and duration_ms is null)
      or (kind = 'voice' and attachment_path like (select auth.uid())::text || '/%')
    )
  );

revoke execute on function public.can_see_pin(bigint, uuid, timestamptz) from public, anon;
revoke execute on function public.owns_pin(bigint) from public, anon;
revoke execute on function public.drop_pin(public.pin_kind, text, text, double precision, double precision, timestamptz, timestamptz, uuid[], boolean) from public, anon;
grant execute on function public.can_see_pin(bigint, uuid, timestamptz) to authenticated;
grant execute on function public.owns_pin(bigint) to authenticated;
grant execute on function public.drop_pin(public.pin_kind, text, text, double precision, double precision, timestamptz, timestamptz, uuid[], boolean) to authenticated;

alter publication supabase_realtime add table public.map_pins;

-- ---------------------------------------------------------------------------
-- Voice message audio: private bucket, files under "<sender id>/...".
-- Readable by the sender and by the recipient of the message that uses it.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-messages', 'voice-messages', false, 10485760,
        array['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/webm', 'audio/ogg'])
on conflict (id) do nothing;

create policy "Riders upload voice notes to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'voice-messages'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Senders and recipients play voice notes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'voice-messages'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.messages m
         where m.attachment_path = storage.objects.name
           and m.recipient_id = (select auth.uid())
      )
    )
  );

create policy "Riders delete their own voice notes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'voice-messages'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

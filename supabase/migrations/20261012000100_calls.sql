-- Voice and video calls between buddies. Media flows through LiveKit; this
-- table is the signalling record (ringing → active → ended) and the call log.
-- The livekit-token edge function only issues room tokens for calls here.

create type public.call_kind as enum ('voice', 'video');
create type public.call_status as enum ('ringing', 'active', 'declined', 'missed', 'ended');

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null default auth.uid()
    constraint calls_caller_id_fkey references public.profiles (id) on delete cascade,
  callee_id uuid not null
    constraint calls_callee_id_fkey references public.profiles (id) on delete cascade,
  kind public.call_kind not null,
  status public.call_status not null default 'ringing',
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  check (caller_id <> callee_id)
);

create index calls_callee_idx on public.calls (callee_id, created_at desc);
create index calls_caller_idx on public.calls (caller_id, created_at desc);

alter table public.messages
  add column call_id uuid references public.calls (id) on delete set null;

alter table public.calls enable row level security;

create policy "Participants see their calls"
  on public.calls for select to authenticated
  using ((select auth.uid()) in (caller_id, callee_id));

-- No insert/update policies: calls change state only through these functions.

create function public.start_call(callee uuid, call_type public.call_kind)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  if not public.are_buddies(me, callee) then
    raise exception 'You can only call your buddies';
  end if;
  -- A ringing call older than a minute was never answered.
  update public.calls set status = 'missed', ended_at = now()
   where status = 'ringing' and created_at < now() - interval '1 minute'
     and (caller_id = me or callee_id = me);

  insert into public.calls (caller_id, callee_id, kind) values (me, callee, call_type)
  returning id into new_id;

  insert into public.messages (sender_id, recipient_id, body, kind, call_id)
  values (me, callee, case when call_type = 'video' then '📹 Video call' else '📞 Voice call' end, 'call', new_id);

  return new_id;
end;
$$;

create function public.answer_call(call uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.calls set status = 'active', answered_at = now()
   where id = call and callee_id = auth.uid() and status = 'ringing';
  if not found then
    raise exception 'This call is no longer ringing';
  end if;
end;
$$;

create function public.decline_call(call uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.calls set status = 'declined', ended_at = now()
   where id = call and callee_id = auth.uid() and status = 'ringing';
$$;

-- Hang up. A call that was still ringing becomes "missed".
create function public.end_call(call uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.calls
     set status = case when status = 'ringing' then 'missed'::public.call_status else 'ended'::public.call_status end,
         ended_at = now()
   where id = call
     and auth.uid() in (caller_id, callee_id)
     and status in ('ringing', 'active');
$$;

revoke execute on function public.start_call(uuid, public.call_kind) from public, anon;
revoke execute on function public.answer_call(uuid) from public, anon;
revoke execute on function public.decline_call(uuid) from public, anon;
revoke execute on function public.end_call(uuid) from public, anon;
grant execute on function public.start_call(uuid, public.call_kind) to authenticated;
grant execute on function public.answer_call(uuid) to authenticated;
grant execute on function public.decline_call(uuid) to authenticated;
grant execute on function public.end_call(uuid) to authenticated;

alter publication supabase_realtime add table public.calls;

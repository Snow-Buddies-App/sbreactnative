import type { RealtimeChannel } from '@supabase/supabase-js';

import type {
  BuddyRequest,
  Conversation,
  Message,
  Mountain,
  Profile,
  SkillLevel,
  Sport,
  Trip,
} from './database.types';
import { toIsoDate } from './dates';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Riders
// ---------------------------------------------------------------------------

export type Rider = Profile & { home_mountain: Mountain | null };

const RIDER_SELECT = '*, home_mountain:mountains(*)';

export type RiderFilters = {
  mountainId?: number | null;
  sport?: Sport | null;
  skill?: SkillLevel | null;
  search?: string;
};

export async function fetchRiders(myId: string, filters: RiderFilters = {}): Promise<Rider[]> {
  let query = supabase
    .from('profiles')
    .select(RIDER_SELECT)
    .eq('onboarded', true)
    .neq('id', myId)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (filters.mountainId) query = query.eq('home_mountain_id', filters.mountainId);
  // "Both" riders match either sport, and a ski/snowboard filter includes them.
  if (filters.sport && filters.sport !== 'both') query = query.in('sport', [filters.sport, 'both']);
  if (filters.skill) query = query.eq('skill_level', filters.skill);
  const search = filters.search?.trim().replace(/[%_,()]/g, '');
  if (search) query = query.ilike('display_name', `%${search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchRider(id: string): Promise<Rider | null> {
  const { data, error } = await supabase.from('profiles').select(RIDER_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Buddies
// ---------------------------------------------------------------------------

export type BuddyRequestWithProfiles = BuddyRequest & {
  requester: Profile;
  addressee: Profile;
};

export type Relationship =
  | { kind: 'none' }
  | { kind: 'outgoing'; request: BuddyRequest }
  | { kind: 'incoming'; request: BuddyRequest }
  | { kind: 'buddies'; request: BuddyRequest };

export async function fetchBuddyRequests(): Promise<BuddyRequestWithProfiles[]> {
  // RLS limits this to requests the current user is part of.
  const { data, error } = await supabase
    .from('buddy_requests')
    .select(
      '*, requester:profiles!buddy_requests_requester_id_fkey(*), addressee:profiles!buddy_requests_addressee_id_fkey(*)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as BuddyRequestWithProfiles[];
}

export function relationshipWith(myId: string, otherId: string, requests: BuddyRequest[]): Relationship {
  const request = requests.find(
    (r) =>
      (r.requester_id === myId && r.addressee_id === otherId) ||
      (r.requester_id === otherId && r.addressee_id === myId),
  );
  if (!request) return { kind: 'none' };
  if (request.status === 'accepted') return { kind: 'buddies', request };
  return request.requester_id === myId ? { kind: 'outgoing', request } : { kind: 'incoming', request };
}

/** The other person in a request. */
export function otherRider(myId: string, request: BuddyRequestWithProfiles): Profile {
  return request.requester_id === myId ? request.addressee : request.requester;
}

export async function sendBuddyRequest(addresseeId: string): Promise<void> {
  const { error } = await supabase.from('buddy_requests').insert({ addressee_id: addresseeId });
  if (error) throw error;
}

export async function acceptBuddyRequest(requestId: number): Promise<void> {
  const { error } = await supabase.rpc('accept_buddy_request', { request_id: requestId });
  if (error) throw error;
}

/** Cancel an outgoing request, decline an incoming one, or unfriend. */
export async function removeBuddyRequest(requestId: number): Promise<void> {
  const { error } = await supabase.from('buddy_requests').delete().eq('id', requestId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function fetchConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase.rpc('get_conversations');
  if (error) throw error;
  return data ?? [];
}

export async function fetchMessages(myId: string, otherId: string, limit = 200): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${myId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${myId})`,
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.reverse();
}

export async function sendMessage(recipientId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ recipient_id: recipientId, body: body.trim() })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function markConversationRead(otherId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', { other_id: otherId });
  if (error) throw error;
}

/** Live inserts of messages sent to me. RLS filters what each client receives. */
export function subscribeToIncomingMessages(myId: string, onMessage: (message: Message) => void): RealtimeChannel {
  return supabase
    // Unique per subscriber: several screens may listen at once.
    .channel(`messages:${myId}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${myId}` },
      (payload) => onMessage(payload.new as Message),
    )
    .subscribe();
}

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

export type TripSummary = Trip & {
  mountain: Mountain;
  host: Profile;
  trip_members: { count: number }[];
};

export type TripDetail = Trip & {
  mountain: Mountain;
  host: Profile;
  members: { user_id: string; joined_at: string; rider: Profile }[];
};

export function memberCount(trip: TripSummary): number {
  return trip.trip_members[0]?.count ?? 0;
}

export async function fetchUpcomingTrips(filters: { mountainId?: number | null } = {}): Promise<TripSummary[]> {
  let query = supabase
    .from('trips')
    .select('*, mountain:mountains(*), host:profiles!trips_host_id_fkey(*), trip_members(count)')
    .gte('trip_date', toIsoDate(new Date()))
    .order('trip_date')
    .order('created_at')
    .limit(100);
  if (filters.mountainId) query = query.eq('mountain_id', filters.mountainId);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as TripSummary[];
}

/** Upcoming trips the user is a member of (hosting or joined). */
export async function fetchMyTripIds(myId: string): Promise<Set<number>> {
  const { data, error } = await supabase.from('trip_members').select('trip_id').eq('user_id', myId);
  if (error) throw error;
  return new Set(data.map((m) => m.trip_id));
}

export async function fetchTrip(id: number): Promise<TripDetail | null> {
  const { data, error } = await supabase
    .from('trips')
    .select(
      '*, mountain:mountains(*), host:profiles!trips_host_id_fkey(*), members:trip_members(user_id, joined_at, rider:profiles!trip_members_user_id_fkey(*))',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const trip = data as unknown as TripDetail;
  trip.members.sort((a, b) => a.joined_at.localeCompare(b.joined_at));
  return trip;
}

export type NewTrip = {
  title: string;
  mountainId: number;
  tripDate: string;
  maxRiders: number;
  minSkill: SkillLevel | null;
  notes: string;
};

export async function createTrip(trip: NewTrip): Promise<number> {
  const { data, error } = await supabase
    .from('trips')
    .insert({
      title: trip.title.trim(),
      mountain_id: trip.mountainId,
      trip_date: trip.tripDate,
      max_riders: trip.maxRiders,
      min_skill: trip.minSkill,
      notes: trip.notes.trim() || null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function joinTrip(tripId: number): Promise<void> {
  const { error } = await supabase.from('trip_members').insert({ trip_id: tripId });
  if (error) throw error;
}

export async function leaveTrip(tripId: number, myId: string): Promise<void> {
  const { error } = await supabase.from('trip_members').delete().eq('trip_id', tripId).eq('user_id', myId);
  if (error) throw error;
}

export async function deleteTrip(tripId: number): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw error;
}

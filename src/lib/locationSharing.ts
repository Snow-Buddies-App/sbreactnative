import type { RealtimeChannel } from '@supabase/supabase-js';

import type { Profile } from './database.types';
import { supabase } from './supabase';

/** A buddy's latest shared position, as shown on the map. */
export type FriendLocation = {
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  updatedAt: string;
};

/** Positions older than this are treated as gone (phone off, out of signal…). */
export const STALE_AFTER_MS = 30 * 60 * 1000;

export const SHARING_DURATIONS = [
  { minutes: 60, label: '1 hour' },
  { minutes: 240, label: '4 hours' },
  { minutes: 480, label: '8 hours' },
] as const;

export async function fetchSharingUntil(myId: string): Promise<Date | null> {
  const { data, error } = await supabase
    .from('location_sharing')
    .select('sharing_until')
    .eq('user_id', myId)
    .maybeSingle();
  if (error) throw error;
  const until = data?.sharing_until ? new Date(data.sharing_until) : null;
  return until && until.getTime() > Date.now() ? until : null;
}

export async function startSharing(minutes: number): Promise<Date> {
  const { data, error } = await supabase.rpc('start_location_sharing', { duration_minutes: minutes });
  if (error) throw error;
  return new Date(data);
}

export async function stopSharing(): Promise<void> {
  const { error } = await supabase.rpc('stop_location_sharing');
  if (error) throw error;
}

export type PositionUpdate = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
};

/** Upload my position. Resolves false if the server says I'm not sharing. */
export async function uploadMyLocation(position: PositionUpdate): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_my_location', {
    lat: position.latitude,
    lng: position.longitude,
    accuracy: position.accuracy ?? null,
    heading_deg: position.heading ?? null,
  });
  if (error) throw error;
  return data;
}

/** Buddy ids that I let see my location. */
export async function fetchMyViewers(myId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('location_shares').select('viewer_id').eq('owner_id', myId);
  if (error) throw error;
  return new Set(data.map((row) => row.viewer_id));
}

export async function setViewer(viewerId: string, canSee: boolean, myId: string): Promise<void> {
  if (canSee) {
    const { error } = await supabase.from('location_shares').insert({ viewer_id: viewerId });
    // Already shared: treat as success.
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase
      .from('location_shares')
      .delete()
      .eq('owner_id', myId)
      .eq('viewer_id', viewerId);
    if (error) throw error;
  }
}

type LocationRow = {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  updated_at: string;
  rider: Pick<Profile, 'display_name'> | null;
};

export function isFresh(updatedAt: string, now = Date.now()): boolean {
  return now - new Date(updatedAt).getTime() < STALE_AFTER_MS;
}

/** Buddies currently sharing their location with me (RLS does the filtering). */
export async function fetchFriendLocations(myId: string): Promise<FriendLocation[]> {
  const { data, error } = await supabase
    .from('live_locations')
    .select('user_id, latitude, longitude, accuracy_m, updated_at, rider:profiles!live_locations_user_id_fkey(display_name)')
    .neq('user_id', myId);
  if (error) throw error;
  return (data as unknown as LocationRow[])
    .filter((row) => isFresh(row.updated_at))
    .map((row) => ({
      userId: row.user_id,
      name: row.rider?.display_name ?? 'Buddy',
      latitude: row.latitude,
      longitude: row.longitude,
      accuracyM: row.accuracy_m,
      updatedAt: row.updated_at,
    }));
}

/** Notify on any live location change I'm allowed to see. */
export function subscribeToFriendLocations(onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`live-locations:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, onChange)
    .subscribe();
}

export function formatLastSeen(updatedAt: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(updatedAt).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}

export function formatUntil(until: Date): string {
  return until.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

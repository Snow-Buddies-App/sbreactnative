import type { RealtimeChannel } from '@supabase/supabase-js';

import type { MapPin, PinKind, Profile } from './database.types';
import type { LatLng } from './openskimap';
import { supabase } from './supabase';

export type PinWithOwner = MapPin & { owner: Pick<Profile, 'id' | 'display_name'> | null };

export const PIN_EXPIRY_OPTIONS = [
  { hours: 3, label: '3 hours' },
  { hours: 24, label: 'Today' },
  { hours: 72, label: '3 days' },
] as const;

export const MEET_IN_OPTIONS = [
  { minutes: 15, label: 'In 15 min' },
  { minutes: 30, label: 'In 30 min' },
  { minutes: 60, label: 'In 1 hour' },
  { minutes: 120, label: 'In 2 hours' },
] as const;

const PIN_SELECT = '*, owner:profiles!map_pins_owner_id_fkey(id, display_name)';

/** Pins I own or that buddies shared with me and that haven't expired. */
export async function fetchVisiblePins(): Promise<PinWithOwner[]> {
  const { data, error } = await supabase
    .from('map_pins')
    .select(PIN_SELECT)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as PinWithOwner[];
}

export async function fetchPin(id: number): Promise<PinWithOwner | null> {
  const { data, error } = await supabase.from('map_pins').select(PIN_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as PinWithOwner | null;
}

export type NewPin = {
  kind: PinKind;
  title: string;
  note: string;
  position: LatLng;
  meetAt: Date | null;
  expiresInHours: number;
  viewerIds: string[];
  postInChat: boolean;
};

/** Expiry for a pin: a meetup lasts until 2 hours after the meeting time. */
export function pinExpiry(pin: Pick<NewPin, 'kind' | 'meetAt' | 'expiresInHours'>, now = new Date()): Date {
  if (pin.kind === 'meetup' && pin.meetAt) {
    return new Date(pin.meetAt.getTime() + 2 * 3_600_000);
  }
  return new Date(now.getTime() + pin.expiresInHours * 3_600_000);
}

export async function dropPin(pin: NewPin): Promise<number> {
  const { data, error } = await supabase.rpc('drop_pin', {
    pin_kind: pin.kind,
    pin_title: pin.title.trim(),
    pin_note: pin.note.trim() || null,
    lat: pin.position.latitude,
    lng: pin.position.longitude,
    meet_time: pin.meetAt?.toISOString() ?? null,
    expires: pinExpiry(pin).toISOString(),
    viewer_ids: pin.viewerIds,
    post_in_chat: pin.postInChat,
  });
  if (error) throw error;
  return data;
}

export async function deletePin(id: number): Promise<void> {
  const { error } = await supabase.from('map_pins').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToPins(onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`map-pins:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'map_pins' }, onChange)
    .subscribe();
}

/** Turn-by-turn directions in Google/Apple Maps (works on every platform). */
export function directionsUrl({ latitude, longitude }: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
}

export function formatMeetTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

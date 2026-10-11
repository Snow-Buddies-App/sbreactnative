import type { RealtimeChannel } from '@supabase/supabase-js';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type { Call, CallKind, Profile } from './database.types';
import { supabase } from './supabase';

export type CallWithPeople = Call & {
  caller: Pick<Profile, 'id' | 'display_name'>;
  callee: Pick<Profile, 'id' | 'display_name'>;
};

/** Seconds a call rings before it counts as missed. */
export const RING_TIMEOUT_MS = 45_000;

/**
 * Calls need the native WebRTC module, which isn't in Expo Go or the web build.
 * They work in development builds and the App Store / Play Store app.
 */
export function callsSupported(): boolean {
  return Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

export async function startCall(calleeId: string, kind: CallKind): Promise<string> {
  const { data, error } = await supabase.rpc('start_call', { callee: calleeId, call_type: kind });
  if (error) throw error;
  return data;
}

export async function answerCall(id: string): Promise<void> {
  const { error } = await supabase.rpc('answer_call', { call: id });
  if (error) throw error;
}

export async function declineCall(id: string): Promise<void> {
  const { error } = await supabase.rpc('decline_call', { call: id });
  if (error) throw error;
}

export async function endCall(id: string): Promise<void> {
  const { error } = await supabase.rpc('end_call', { call: id });
  if (error) throw error;
}

export async function fetchCall(id: string): Promise<CallWithPeople | null> {
  const { data, error } = await supabase
    .from('calls')
    .select(
      '*, caller:profiles!calls_caller_id_fkey(id, display_name), callee:profiles!calls_callee_id_fkey(id, display_name)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as CallWithPeople | null;
}

/** Inserts and status changes for calls I'm part of (RLS filters the stream). */
export function subscribeToMyCalls(onChange: (call: Call) => void): RealtimeChannel {
  return supabase
    .channel(`calls:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, (payload) => {
      if (payload.new && 'id' in payload.new) onChange(payload.new as Call);
    })
    .subscribe();
}

/** A LiveKit room token from the livekit-token edge function. */
export async function fetchCallToken(callId: string): Promise<{ token: string; url: string }> {
  const { data, error } = await supabase.functions.invoke<{ token: string; url: string }>('livekit-token', {
    body: { callId },
  });
  if (error) throw error;
  if (!data?.token || !data.url) throw new Error('Calling is not set up yet.');
  return data;
}

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient<Database>(
  // A placeholder keeps the client constructible so the app can render a
  // "configure Supabase" message instead of crashing on launch.
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // PKCE: OAuth and email links return a one-time ?code= to exchange.
      flowType: 'pkce',
    },
  },
);

// Refresh tokens only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

/** Turn a Supabase/Postgres error into something a rider can read. */
export function friendlyError(error: unknown): string {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  if (message.includes('Invalid login credentials')) return 'Email or password is incorrect.';
  if (message.includes('User already registered')) return 'An account with that email already exists.';
  if (message.includes('Email not confirmed')) return 'Check your inbox to confirm your email first.';
  if (message.includes('This trip is full')) return 'This trip is full.';
  if (message.includes('already happened')) return 'This trip has already happened.';
  if (message.includes('buddy_requests_pair_idx')) return 'You already have a buddy request with this rider.';
  if (message.includes('row-level security')) return "You don't have permission to do that.";
  if (message.includes('Network request failed') || message.includes('Failed to fetch')) {
    return 'Network error. Check your connection and try again.';
  }
  return message || 'Something went wrong.';
}

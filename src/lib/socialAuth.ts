import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { handleAuthLink } from './authLinks';
import { supabase } from './supabase';

export type SocialProvider = 'google' | 'facebook';

WebBrowser.maybeCompleteAuthSession();

/**
 * Sign in with Google or Facebook through Supabase OAuth. Opens the provider in
 * an in-app browser and finishes the PKCE exchange when it redirects back.
 * Returns false if the rider closed the browser.
 */
export async function signInWithProvider(provider: SocialProvider): Promise<boolean> {
  const redirectTo = Linking.createURL('/login');

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw error;
    return true;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  await handleAuthLink(result.url);
  return true;
}

import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { handleAuthLink } from '@/lib/authLinks';
import type { Database, Profile } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  /** True until the stored session (and its profile) has been restored. */
  loading: boolean;
  /** Set after opening a password reset link, until the new password is saved. */
  passwordRecovery: boolean;
  finishPasswordRecovery: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (changes: ProfileUpdate) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Which user's profile has finished loading (successfully or not).
  const [profileLoadedFor, setProfileLoadedFor] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const userId = session?.user.id ?? null;
  const loading = !sessionReady || (userId !== null && profileLoadedFor !== userId);
  // Never expose a previous user's profile after signing out or switching accounts.
  const currentProfile = userId && profile?.id === userId ? profile : null;

  const loadProfile = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    setProfile(data);
  }, []);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((error) => console.warn('Failed to restore session', error))
      .finally(() => setSessionReady(true));

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Email confirmation and password reset links open the app via deep link.
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (!url) return;
    handleAuthLink(url)
      .then((type) => {
        if (type === 'recovery') setPasswordRecovery(true);
      })
      .catch((error) => console.warn('Could not sign in from link', error));
  }, [url]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) setProfile(data);
      })
      .then(undefined, (error: unknown) => console.warn('Failed to load profile', error))
      .then(() => active && setProfileLoadedFor(userId));
    return () => {
      active = false;
    };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [userId, loadProfile]);

  const updateProfile = useCallback(
    async (changes: ProfileUpdate) => {
      if (!userId) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('profiles')
        .update(changes)
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;
      setProfile(data);
    },
    [userId],
  );

  const finishPasswordRecovery = useCallback(() => setPasswordRecovery(false), []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      session,
      profile: currentProfile,
      loading,
      passwordRecovery,
      finishPasswordRecovery,
      refreshProfile,
      updateProfile,
      signOut,
    }),
    [
      session,
      currentProfile,
      loading,
      passwordRecovery,
      finishPasswordRecovery,
      refreshProfile,
      updateProfile,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/** The signed-in user's profile. Only use on screens behind the auth guard. */
export function useCurrentProfile(): Profile {
  const { profile } = useAuth();
  if (!profile) throw new Error('useCurrentProfile used without a signed-in profile');
  return profile;
}

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfigMissingScreen, ProfileErrorScreen } from '@/components/AppStatusScreens';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
// Also registers the background location task at startup.
import { LocationSharingProvider } from '@/providers/LocationSharingProvider';
import theme from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style="dark" />
        {isSupabaseConfigured ? (
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        ) : (
          <ConfigMissingScreen />
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, profile, loading, passwordRecovery } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (loading) return null;
  if (session && !profile) return <ProfileErrorScreen />;

  const signedIn = !!session;
  const onboarded = !!profile?.onboarded;

  const stack = (
    <Stack
      screenOptions={{
        headerTintColor: theme.colors.primary,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Log in' }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Create account' }} />
        <Stack.Screen name="(auth)/forgot-password" options={{ title: 'Reset password' }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && passwordRecovery}>
        <Stack.Screen name="update-password" options={{ title: 'New password' }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !passwordRecovery && !onboarded}>
        <Stack.Screen name="profile-setup" options={{ title: 'Set up your profile' }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !passwordRecovery && onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="rider/[id]" options={{ title: 'Rider' }} />
        <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
        <Stack.Screen name="trip/[id]" options={{ title: 'Trip' }} />
        <Stack.Screen name="trip/new" options={{ title: 'Plan a trip', presentation: 'modal' }} />
        <Stack.Screen name="resort/[id]" options={{ title: 'Ski map' }} />
        <Stack.Screen name="edit-profile" options={{ title: 'Edit profile', presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );

  return session ? <LocationSharingProvider userId={session.user.id}>{stack}</LocationSharingProvider> : stack;
}

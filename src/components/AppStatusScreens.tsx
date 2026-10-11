import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorView } from '@/components/StateViews';
import { useAuth } from '@/providers/AuthProvider';

export function ConfigMissingScreen() {
  // Riders only ever see a generic message; the setup hint is for developers.
  if (__DEV__) {
    console.warn(
      'Backend not configured: add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart Expo.',
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <Text variant="headlineSmall">Snow Buddies can&apos;t connect right now</Text>
      <Text variant="bodyMedium" style={styles.body}>
        Please try again in a little while.
      </Text>
    </SafeAreaView>
  );
}

export function ProfileErrorScreen() {
  const { refreshProfile, signOut } = useAuth();
  return (
    <SafeAreaView style={styles.flex}>
      <ErrorView
        message="We couldn't load your profile."
        onRetry={() => refreshProfile().catch(() => {})}
      />
      <View style={styles.footer}>
        <Button onPress={signOut}>Sign out</Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  body: { opacity: 0.8 },
  flex: { flex: 1 },
  footer: { alignItems: 'center', paddingBottom: 24 },
});

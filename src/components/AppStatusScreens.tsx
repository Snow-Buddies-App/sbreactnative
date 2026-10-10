import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorView } from '@/components/StateViews';
import { useAuth } from '@/providers/AuthProvider';

export function ConfigMissingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text variant="headlineSmall">Supabase is not configured</Text>
      <Text variant="bodyMedium" style={styles.body}>
        Copy .env.example to .env.local, add EXPO_PUBLIC_SUPABASE_URL and
        EXPO_PUBLIC_SUPABASE_ANON_KEY from your Supabase project, then restart Expo.
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

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, Text } from 'react-native-paper';

import { signInWithProvider } from '@/lib/socialAuth';
import type { SocialProvider } from '@/lib/socialAuth';
import { friendlyError } from '@/lib/supabase';

const PROVIDERS: { id: SocialProvider; label: string; icon: string; color: string }[] = [
  { id: 'google', label: 'Continue with Google', icon: 'google', color: '#DB4437' },
  { id: 'facebook', label: 'Continue with Facebook', icon: 'facebook', color: '#1877F2' },
];

/** Google / Facebook buttons plus an "or" divider above the email form. */
export function SocialSignIn() {
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (provider: SocialProvider) => {
    setError(null);
    setPending(provider);
    try {
      await signInWithProvider(provider);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setPending(null);
    }
  };

  return (
    <View style={styles.container}>
      {PROVIDERS.map((p) => (
        <Button
          key={p.id}
          mode="outlined"
          icon={p.icon}
          textColor={p.color}
          onPress={() => signIn(p.id)}
          loading={pending === p.id}
          disabled={pending !== null}
          style={styles.button}
        >
          {p.label}
        </Button>
      ))}
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
      <View style={styles.orRow}>
        <Divider style={styles.divider} />
        <Text variant="labelMedium" style={styles.or}>
          or use email
        </Text>
        <Divider style={styles.divider} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginBottom: 8 },
  button: { backgroundColor: '#FFFFFF' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { flex: 1 },
  or: { opacity: 0.6 },
});

import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { ProfileForm } from '@/components/ProfileForm';
import { useAuth, useCurrentProfile } from '@/providers/AuthProvider';

export default function ProfileSetupScreen() {
  const profile = useCurrentProfile();
  const { signOut } = useAuth();

  return (
    <View style={styles.flex}>
      <Text variant="bodyLarge" style={styles.intro}>
        Tell other riders a bit about you so we can match you with the right buddies.
      </Text>
      <ProfileForm profile={profile} submitLabel="Start riding" />
      <Button onPress={signOut} style={styles.signOut}>
        Sign out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { paddingHorizontal: 24, paddingTop: 16 },
  signOut: { marginBottom: 24 },
});

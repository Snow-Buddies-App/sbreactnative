import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, List, Text } from 'react-native-paper';

import { RiderAvatar } from '@/components/RiderAvatar';
import { useMountains } from '@/hooks/useMountains';
import { confirm } from '@/lib/confirm';
import { skillLabel, sportLabel } from '@/lib/labels';
import { useAuth, useCurrentProfile } from '@/providers/AuthProvider';

export default function ProfileScreen() {
  const me = useCurrentProfile();
  const { session, signOut } = useAuth();
  const { mountains } = useMountains();
  const home = mountains.find((m) => m.id === me.home_mountain_id);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <RiderAvatar id={me.id} name={me.display_name} size={88} />
        <Text variant="headlineSmall">{me.display_name}</Text>
        <Text variant="bodyMedium" style={styles.muted}>
          {session?.user.email}
        </Text>
      </View>

      <Card mode="contained">
        <List.Item title={sportLabel(me.sport)} description="Rides" left={(p) => <List.Icon {...p} icon="ski" />} />
        <List.Item
          title={skillLabel(me.skill_level)}
          description="Level"
          left={(p) => <List.Icon {...p} icon="chart-line-variant" />}
        />
        <List.Item
          title={home?.name ?? 'Not set'}
          description="Home mountain"
          left={(p) => <List.Icon {...p} icon="image-filter-hdr" />}
          right={home ? (p) => <List.Icon {...p} icon="map" /> : undefined}
          onPress={home ? () => router.push(`/resort/${home.id}`) : undefined}
        />
      </Card>

      {me.bio ? (
        <Card mode="contained">
          <Card.Content>
            <Text variant="bodyMedium">{me.bio}</Text>
          </Card.Content>
        </Card>
      ) : null}

      <Button mode="contained" icon="pencil" onPress={() => router.push('/edit-profile')}>
        Edit profile
      </Button>
      <Button
        mode="outlined"
        icon="logout"
        onPress={async () => {
          if (await confirm('Sign out?', 'You can sign back in any time.', 'Sign out')) await signOut();
        }}
      >
        Sign out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  header: { alignItems: 'center', gap: 8 },
  muted: { opacity: 0.7 },
});

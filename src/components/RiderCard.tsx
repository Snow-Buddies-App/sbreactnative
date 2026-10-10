import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, Text } from 'react-native-paper';

import { RiderAvatar } from '@/components/RiderAvatar';
import type { Relationship, Rider } from '@/lib/api';
import { skillLabel, sportLabel } from '@/lib/labels';

const RELATIONSHIP_LABEL: Record<Relationship['kind'], string | null> = {
  none: null,
  outgoing: 'Request sent',
  incoming: 'Wants to ride',
  buddies: 'Buddy',
};

export function RiderCard({ rider, relationship }: { rider: Rider; relationship: Relationship }) {
  const status = RELATIONSHIP_LABEL[relationship.kind];
  return (
    <Card mode="elevated" style={styles.card} onPress={() => router.push(`/rider/${rider.id}`)}>
      <Card.Content style={styles.row}>
        <RiderAvatar id={rider.id} name={rider.display_name} />
        <View style={styles.body}>
          <Text variant="titleMedium">{rider.display_name}</Text>
          <Text variant="bodySmall" style={styles.muted}>
            {sportLabel(rider.sport)} · {skillLabel(rider.skill_level)}
            {rider.home_mountain ? ` · ${rider.home_mountain.name}` : ''}
          </Text>
          {rider.bio ? (
            <Text variant="bodySmall" numberOfLines={2} style={styles.bio}>
              {rider.bio}
            </Text>
          ) : null}
        </View>
        {status && (
          <Chip compact style={styles.status} textStyle={styles.statusText}>
            {status}
          </Chip>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flex: 1, gap: 2 },
  muted: { opacity: 0.7 },
  bio: { marginTop: 4 },
  status: { alignSelf: 'flex-start' },
  statusText: { fontSize: 11 },
});

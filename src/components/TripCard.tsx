import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, Text } from 'react-native-paper';

import type { TripSummary } from '@/lib/api';
import { memberCount } from '@/lib/api';
import { formatTripDate } from '@/lib/dates';
import { skillLabel } from '@/lib/labels';

export function TripCard({ trip, joined }: { trip: TripSummary; joined: boolean }) {
  const riders = memberCount(trip);
  const full = riders >= trip.max_riders;
  return (
    <Card mode="elevated" style={styles.card} onPress={() => router.push(`/trip/${trip.id}`)}>
      <Card.Title
        title={trip.title}
        subtitle={`${formatTripDate(trip.trip_date)} · ${trip.mountain.name}`}
        titleVariant="titleMedium"
      />
      <Card.Content>
        <Text variant="bodySmall" style={styles.muted}>
          Hosted by {trip.host.display_name}
        </Text>
        <View style={styles.chips}>
          <Chip compact icon="account-multiple">
            {riders}/{trip.max_riders} riders
          </Chip>
          {trip.min_skill && (
            <Chip compact icon="chart-line-variant">
              {skillLabel(trip.min_skill)}+
            </Chip>
          )}
          {joined ? (
            <Chip compact icon="check" style={styles.joined}>
              You&apos;re in
            </Chip>
          ) : full ? (
            <Chip compact icon="lock">
              Full
            </Chip>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginVertical: 6 },
  muted: { opacity: 0.7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  joined: { backgroundColor: '#E3F0B8' },
});

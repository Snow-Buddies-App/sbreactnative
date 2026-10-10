import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, HelperText, List, Text } from 'react-native-paper';

import { RiderAvatar } from '@/components/RiderAvatar';
import { ErrorView, LoadingView } from '@/components/StateViews';
import { useAsyncData } from '@/hooks/useAsyncData';
import { deleteTrip, fetchTrip, joinTrip, leaveTrip } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { formatTripDate, fromIsoDate } from '@/lib/dates';
import { meetsSkill, skillLabel, sportLabel } from '@/lib/labels';
import { friendlyError } from '@/lib/supabase';
import { useCurrentProfile } from '@/providers/AuthProvider';

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = Number(id);
  const me = useCurrentProfile();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: trip, error, loading, reload, refresh } = useAsyncData(() => fetchTrip(tripId), [tripId]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={refresh} />;
  if (!trip) return <ErrorView message="This trip no longer exists." />;

  const isHost = trip.host_id === me.id;
  const isMember = trip.members.some((m) => m.user_id === me.id);
  const full = trip.members.length >= trip.max_riders;
  const skillOk = meetsSkill(me.skill_level, trip.min_skill);

  const act = async (action: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      if (after) after();
      else await reload();
    } catch (e) {
      setActionError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: trip.title }} />
      <View style={styles.header}>
        <Text variant="headlineSmall">{trip.title}</Text>
        <Text variant="titleMedium" style={styles.muted}>
          {formatTripDate(trip.trip_date)} ·{' '}
          {fromIsoDate(trip.trip_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
        <View style={styles.chips}>
          <Chip icon="account-multiple">
            {trip.members.length}/{trip.max_riders} riders
          </Chip>
          <Chip icon="chart-line-variant">{trip.min_skill ? `${skillLabel(trip.min_skill)}+` : 'All levels'}</Chip>
        </View>
      </View>

      <Card mode="contained">
        <List.Item
          title={trip.mountain.name}
          description={`${trip.mountain.region}, ${trip.mountain.country}`}
          left={(p) => <List.Icon {...p} icon="image-filter-hdr" />}
          right={(p) => <List.Icon {...p} icon="map" />}
          onPress={() => router.push(`/resort/${trip.mountain.id}`)}
        />
      </Card>

      {trip.notes ? (
        <Card mode="contained">
          <Card.Content>
            <Text variant="bodyMedium">{trip.notes}</Text>
          </Card.Content>
        </Card>
      ) : null}

      <View>
        <List.Subheader>Riders</List.Subheader>
        {trip.members.map((member) => (
          <List.Item
            key={member.user_id}
            title={member.rider.display_name + (member.user_id === trip.host_id ? ' (host)' : '')}
            description={`${sportLabel(member.rider.sport)} · ${skillLabel(member.rider.skill_level)}`}
            left={() => (
              <View style={styles.avatar}>
                <RiderAvatar id={member.user_id} name={member.rider.display_name} size={40} />
              </View>
            )}
            onPress={member.user_id === me.id ? undefined : () => router.push(`/rider/${member.user_id}`)}
          />
        ))}
      </View>

      <View style={styles.actions}>
        {!isMember && (
          <>
            <Button
              mode="contained"
              icon="account-plus"
              loading={busy}
              disabled={busy || full}
              onPress={() => act(() => joinTrip(trip.id))}
            >
              {full ? 'Trip is full' : 'Join trip'}
            </Button>
            {!skillOk && !full && (
              <HelperText type="info">
                Heads up: this trip is aimed at {skillLabel(trip.min_skill)} riders and up.
              </HelperText>
            )}
          </>
        )}
        {isMember && !isHost && (
          <Button mode="outlined" loading={busy} disabled={busy} onPress={() => act(() => leaveTrip(trip.id, me.id))}>
            Leave trip
          </Button>
        )}
        {isHost && (
          <Button
            mode="text"
            textColor="#C62828"
            disabled={busy}
            onPress={async () => {
              if (await confirm('Cancel this trip?', 'Everyone who joined will be removed.', 'Cancel trip')) {
                await act(() => deleteTrip(trip.id), () => router.back());
              }
            }}
          >
            Cancel trip
          </Button>
        )}
        <HelperText type="error" visible={!!actionError}>
          {actionError}
        </HelperText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  header: { gap: 6 },
  muted: { opacity: 0.7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  avatar: { justifyContent: 'center', paddingLeft: 8 },
  actions: { gap: 8 },
});

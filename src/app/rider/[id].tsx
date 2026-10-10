import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, List, Text } from 'react-native-paper';

import { RiderAvatar } from '@/components/RiderAvatar';
import { ErrorView, LoadingView } from '@/components/StateViews';
import { useAsyncData } from '@/hooks/useAsyncData';
import {
  acceptBuddyRequest,
  fetchBuddyRequests,
  fetchRider,
  relationshipWith,
  removeBuddyRequest,
  sendBuddyRequest,
} from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { skillLabel, sportLabel } from '@/lib/labels';
import { friendlyError } from '@/lib/supabase';
import { useCurrentProfile } from '@/providers/AuthProvider';

export default function RiderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useCurrentProfile();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, loading, reload, refresh } = useAsyncData(async () => {
    const [rider, requests] = await Promise.all([fetchRider(id), fetchBuddyRequests()]);
    return { rider, requests };
  }, [id]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={refresh} />;
  const rider = data?.rider;
  if (!rider) return <ErrorView message="This rider could not be found." />;

  const relationship = relationshipWith(me.id, rider.id, data.requests);

  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (e) {
      setActionError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: rider.display_name }} />
      <View style={styles.header}>
        <RiderAvatar id={rider.id} name={rider.display_name} size={88} />
        <Text variant="headlineSmall">{rider.display_name}</Text>
      </View>

      <Card mode="contained">
        <List.Item title={sportLabel(rider.sport)} description="Rides" left={(p) => <List.Icon {...p} icon="ski" />} />
        <List.Item
          title={skillLabel(rider.skill_level)}
          description="Level"
          left={(p) => <List.Icon {...p} icon="chart-line-variant" />}
        />
        <List.Item
          title={rider.home_mountain?.name ?? 'Not set'}
          description="Home mountain"
          left={(p) => <List.Icon {...p} icon="image-filter-hdr" />}
          onPress={rider.home_mountain ? () => router.push(`/resort/${rider.home_mountain!.id}`) : undefined}
          right={rider.home_mountain ? (p) => <List.Icon {...p} icon="map" /> : undefined}
        />
      </Card>

      {rider.bio ? (
        <Card mode="contained">
          <Card.Content>
            <Text variant="bodyMedium">{rider.bio}</Text>
          </Card.Content>
        </Card>
      ) : null}

      <View style={styles.actions}>
        {relationship.kind === 'none' && (
          <Button mode="contained" icon="account-plus" loading={busy} disabled={busy} onPress={() => act(() => sendBuddyRequest(rider.id))}>
            Add buddy
          </Button>
        )}
        {relationship.kind === 'outgoing' && (
          <Button mode="outlined" icon="close" loading={busy} disabled={busy} onPress={() => act(() => removeBuddyRequest(relationship.request.id))}>
            Cancel request
          </Button>
        )}
        {relationship.kind === 'incoming' && (
          <>
            <Button mode="contained" icon="check" loading={busy} disabled={busy} onPress={() => act(() => acceptBuddyRequest(relationship.request.id))}>
              Accept buddy request
            </Button>
            <Button mode="outlined" disabled={busy} onPress={() => act(() => removeBuddyRequest(relationship.request.id))}>
              Decline
            </Button>
          </>
        )}
        {relationship.kind === 'buddies' && (
          <>
            <Button mode="contained" icon="message-text" onPress={() => router.push(`/chat/${rider.id}`)}>
              Message
            </Button>
            <Button
              mode="text"
              textColor="#C62828"
              disabled={busy}
              onPress={async () => {
                if (await confirm('Remove buddy?', `You and ${rider.display_name} will no longer be able to message each other.`, 'Remove')) {
                  await act(() => removeBuddyRequest(relationship.request.id));
                }
              }}
            >
              Remove buddy
            </Button>
          </>
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
  header: { alignItems: 'center', gap: 12 },
  actions: { gap: 10 },
});

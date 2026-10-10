import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { Badge, Button, List, Text } from 'react-native-paper';

import { RiderAvatar } from '@/components/RiderAvatar';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { useAsyncData } from '@/hooks/useAsyncData';
import {
  acceptBuddyRequest,
  fetchBuddyRequests,
  fetchConversations,
  otherRider,
  removeBuddyRequest,
  subscribeToIncomingMessages,
} from '@/lib/api';
import type { BuddyRequestWithProfiles } from '@/lib/api';
import type { Conversation } from '@/lib/database.types';
import { formatMessageTime } from '@/lib/dates';
import { skillLabel, sportLabel } from '@/lib/labels';
import { friendlyError, supabase } from '@/lib/supabase';
import { useCurrentProfile } from '@/providers/AuthProvider';

type Row =
  | { kind: 'incoming'; request: BuddyRequestWithProfiles }
  | { kind: 'outgoing'; request: BuddyRequestWithProfiles }
  | { kind: 'buddy'; request: BuddyRequestWithProfiles; conversation?: Conversation };

export default function BuddiesScreen() {
  const me = useCurrentProfile();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, loading, refreshing, refresh, reload } = useAsyncData(async () => {
    const [requests, conversations] = await Promise.all([fetchBuddyRequests(), fetchConversations()]);
    return { requests, conversations };
  }, []);

  // New messages update unread counts and ordering live.
  useEffect(() => {
    const channel = subscribeToIncomingMessages(me.id, () => void reload());
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me.id, reload]);

  const sections = useMemo(() => {
    const requests = data?.requests ?? [];
    const byBuddy = new Map((data?.conversations ?? []).map((c) => [c.buddy_id, c]));
    const incoming: Row[] = requests
      .filter((r) => r.status === 'pending' && r.addressee_id === me.id)
      .map((request) => ({ kind: 'incoming', request }));
    const outgoing: Row[] = requests
      .filter((r) => r.status === 'pending' && r.requester_id === me.id)
      .map((request) => ({ kind: 'outgoing', request }));
    const buddies: Row[] = requests
      .filter((r) => r.status === 'accepted')
      .map((request) => ({
        kind: 'buddy' as const,
        request,
        conversation: byBuddy.get(otherRider(me.id, request).id),
      }))
      // Most recent conversation first, then buddies you haven't messaged.
      .sort((a, b) => (b.conversation?.last_at ?? '').localeCompare(a.conversation?.last_at ?? ''));

    return [
      { title: 'Buddy requests', data: incoming },
      { title: 'Your buddies', data: buddies },
      { title: 'Sent requests', data: outgoing },
    ].filter((s) => s.data.length > 0);
  }, [data, me.id]);

  const act = async (id: number, action: () => Promise<void>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (e) {
      setActionError(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={refresh} />;

  const renderItem = ({ item }: { item: Row }) => {
    const rider = otherRider(me.id, item.request);
    const avatar = () => (
      <View style={styles.avatar}>
        <RiderAvatar id={rider.id} name={rider.display_name} />
      </View>
    );
    const busy = busyId === item.request.id;

    if (item.kind === 'incoming') {
      return (
        <List.Item
          title={rider.display_name}
          description={`${sportLabel(rider.sport)} · ${skillLabel(rider.skill_level)}`}
          left={avatar}
          onPress={() => router.push(`/rider/${rider.id}`)}
          right={() => (
            <View style={styles.actions}>
              <Button compact mode="contained" loading={busy} disabled={busy} onPress={() => act(item.request.id, () => acceptBuddyRequest(item.request.id))}>
                Accept
              </Button>
              <Button compact disabled={busy} onPress={() => act(item.request.id, () => removeBuddyRequest(item.request.id))}>
                Decline
              </Button>
            </View>
          )}
        />
      );
    }

    if (item.kind === 'outgoing') {
      return (
        <List.Item
          title={rider.display_name}
          description="Waiting for them to accept"
          left={avatar}
          onPress={() => router.push(`/rider/${rider.id}`)}
          right={() => (
            <Button compact disabled={busy} onPress={() => act(item.request.id, () => removeBuddyRequest(item.request.id))}>
              Cancel
            </Button>
          )}
        />
      );
    }

    const conversation = item.conversation;
    const unread = conversation?.unread_count ?? 0;
    const preview = conversation
      ? `${conversation.last_sender_id === me.id ? 'You: ' : ''}${conversation.last_body}`
      : 'Say hi 👋';
    return (
      <List.Item
        title={rider.display_name}
        titleStyle={unread > 0 ? styles.unread : undefined}
        description={preview}
        descriptionNumberOfLines={1}
        left={avatar}
        onPress={() => router.push(`/chat/${rider.id}`)}
        right={() => (
          <View style={styles.meta}>
            {conversation && <Text variant="labelSmall">{formatMessageTime(conversation.last_at)}</Text>}
            {unread > 0 && <Badge>{unread}</Badge>}
          </View>
        )}
      />
    );
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => `${item.kind}-${item.request.id}`}
      renderItem={renderItem}
      renderSectionHeader={({ section }) => (
        <List.Subheader style={styles.header}>{section.title}</List.Subheader>
      )}
      ListHeaderComponent={actionError ? <Text style={styles.error}>{actionError}</Text> : null}
      ListEmptyComponent={
        <EmptyView
          icon="account-group-outline"
          title="No buddies yet"
          body="Find riders on the Discover tab and send them a buddy request."
          action={
            <Button mode="contained" onPress={() => router.navigate('/')}>
              Discover riders
            </Button>
          }
        />
      }
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      stickySectionHeadersEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, paddingBottom: 24 },
  header: { paddingTop: 16 },
  avatar: { justifyContent: 'center', paddingLeft: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  unread: { fontWeight: 'bold' },
  error: { color: '#C62828', padding: 16 },
});

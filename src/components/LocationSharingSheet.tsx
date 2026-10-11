import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Divider, HelperText, List, Portal, Switch, Text } from 'react-native-paper';

import { RiderAvatar } from '@/components/RiderAvatar';
import { fetchBuddyRequests, otherRider } from '@/lib/api';
import type { Profile } from '@/lib/database.types';
import { fetchMyViewers, formatUntil, setViewer, SHARING_DURATIONS } from '@/lib/locationSharing';
import { friendlyError } from '@/lib/supabase';
import { useCurrentProfile } from '@/providers/AuthProvider';
import { useLocationSharing } from '@/providers/LocationSharingProvider';

/** Start/stop sharing and choose exactly which buddies can see you. */
export function LocationSharingSheet({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const me = useCurrentProfile();
  const sharing = useLocationSharing();
  const [buddies, setBuddies] = useState<Profile[] | null>(null);
  const [viewers, setViewers] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    Promise.all([fetchBuddyRequests(), fetchMyViewers(me.id)])
      .then(([requests, viewerIds]) => {
        if (!active) return;
        setBuddies(
          requests
            .filter((r) => r.status === 'accepted')
            .map((r) => otherRider(me.id, r))
            .sort((a, b) => a.display_name.localeCompare(b.display_name)),
        );
        setViewers(viewerIds);
        setError(null);
      })
      .catch((e) => active && setError(friendlyError(e)));
    return () => {
      active = false;
    };
  }, [visible, me.id]);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const toggleViewer = (buddyId: string, canSee: boolean) =>
    run(buddyId, async () => {
      await setViewer(buddyId, canSee, me.id);
      setViewers((prev) => {
        const next = new Set(prev);
        if (canSee) next.add(buddyId);
        else next.delete(buddyId);
        return next;
      });
    });

  const setAll = (canSee: boolean) =>
    run('all', async () => {
      const targets = (buddies ?? []).filter((b) => viewers.has(b.id) !== canSee);
      for (const buddy of targets) await setViewer(buddy.id, canSee, me.id);
      setViewers(canSee ? new Set((buddies ?? []).map((b) => b.id)) : new Set());
    });

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Share my location</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.content}>
            {sharing.sharingUntil ? (
              <View style={styles.status}>
                <Text variant="titleSmall">📍 Sharing until {formatUntil(sharing.sharingUntil)}</Text>
                <View style={styles.row}>
                  <Button
                    mode="contained"
                    buttonColor="#C62828"
                    loading={busy === 'stop'}
                    disabled={busy !== null}
                    onPress={() => run('stop', sharing.stop)}
                  >
                    Stop sharing
                  </Button>
                  <Button disabled={busy !== null} onPress={() => run('extend', () => sharing.start(240))}>
                    Extend 4 h
                  </Button>
                </View>
              </View>
            ) : (
              <View style={styles.status}>
                <Text variant="bodyMedium">Share your live location for:</Text>
                <View style={styles.row}>
                  {SHARING_DURATIONS.map((d) => (
                    <Button
                      key={d.minutes}
                      mode="contained-tonal"
                      loading={busy === `start-${d.minutes}`}
                      disabled={busy !== null}
                      onPress={() => run(`start-${d.minutes}`, () => sharing.start(d.minutes))}
                    >
                      {d.label}
                    </Button>
                  ))}
                </View>
              </View>
            )}

            {sharing.permissionDenied && (
              <HelperText type="error">
                Location permission is off. Enable it in your phone settings so buddies can see you.
              </HelperText>
            )}

            {sharing.backgroundSupported && (
              <List.Item
                title="Keep sharing when the app is closed"
                description="Uses more battery. Turns off when sharing ends."
                right={() => (
                  <Switch
                    value={sharing.shareInBackground}
                    onValueChange={(v) => void sharing.setShareInBackground(v)}
                  />
                )}
              />
            )}

            <Divider style={styles.divider} />
            <View style={styles.viewersHeader}>
              <Text variant="titleSmall">Who can see me</Text>
              {buddies && buddies.length > 0 && (
                <View style={styles.row}>
                  <Button compact disabled={busy !== null} onPress={() => setAll(true)}>
                    All
                  </Button>
                  <Button compact disabled={busy !== null} onPress={() => setAll(false)}>
                    None
                  </Button>
                </View>
              )}
            </View>
            {buddies === null && !error && <Text style={styles.muted}>Loading buddies…</Text>}
            {buddies?.length === 0 && (
              <Text style={styles.muted}>Add buddies first. Only buddies you pick here can see you.</Text>
            )}
            {buddies?.map((buddy) => (
              <List.Item
                key={buddy.id}
                title={buddy.display_name}
                left={() => (
                  <View style={styles.avatar}>
                    <RiderAvatar id={buddy.id} name={buddy.display_name} size={36} />
                  </View>
                )}
                right={() => (
                  <Switch
                    value={viewers.has(buddy.id)}
                    disabled={busy !== null}
                    onValueChange={(v) => void toggleViewer(buddy.id, v)}
                    accessibilityLabel={`Let ${buddy.display_name} see my location`}
                  />
                )}
              />
            ))}
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
            <Text variant="bodySmall" style={styles.muted}>
              Only the buddies you switch on can see you, and only while sharing is on. We keep just your
              latest position and delete it as soon as sharing stops.
            </Text>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Done</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { maxHeight: '90%' },
  scrollArea: { paddingHorizontal: 0 },
  content: { paddingHorizontal: 24, paddingVertical: 8, gap: 4 },
  status: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  divider: { marginVertical: 8 },
  viewersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: { justifyContent: 'center' },
  muted: { opacity: 0.7 },
});

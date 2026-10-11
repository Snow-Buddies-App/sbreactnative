import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { Button, Dialog, HelperText, Portal, Text } from 'react-native-paper';

import { confirm } from '@/lib/confirm';
import type { LatLng } from '@/lib/openskimap';
import { distanceKm } from '@/lib/openskimap';
import { deletePin, directionsUrl, formatMeetTime } from '@/lib/pins';
import type { PinWithOwner } from '@/lib/pins';
import { friendlyError } from '@/lib/supabase';
import { useCurrentProfile } from '@/providers/AuthProvider';

type Props = {
  pin: PinWithOwner | null;
  userLocation: LatLng | null;
  onDismiss: () => void;
  onDeleted: () => void;
};

export function PinDetailsSheet({ pin, userLocation, onDismiss, onDeleted }: Props) {
  const me = useCurrentProfile();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!pin) return null;
  const mine = pin.owner_id === me.id;
  const position = { latitude: pin.latitude, longitude: pin.longitude };
  const km = userLocation ? distanceKm(userLocation, position) : null;

  const remove = async () => {
    if (!(await confirm('Remove this pin?', 'Buddies will no longer see it on the map.', 'Remove'))) return;
    setDeleting(true);
    setError(null);
    try {
      await deletePin(pin.id);
      onDeleted();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Portal>
      <Dialog visible onDismiss={onDismiss}>
        <Dialog.Icon icon={pin.kind === 'meetup' ? 'flag-checkered' : 'map-marker'} />
        <Dialog.Title style={styles.center}>{pin.title}</Dialog.Title>
        <Dialog.Content style={styles.content}>
          {pin.kind === 'meetup' && pin.meet_at && (
            <Text variant="titleMedium" style={styles.center}>
              Meet at {formatMeetTime(pin.meet_at)}
            </Text>
          )}
          <Text variant="bodyMedium" style={[styles.center, styles.muted]}>
            {mine ? 'Shared by you' : `Shared by ${pin.owner?.display_name ?? 'a buddy'}`}
            {km !== null ? ` · ${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} away` : ''}
          </Text>
          {pin.note ? <Text variant="bodyMedium">{pin.note}</Text> : null}
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          {mine ? (
            <Button textColor="#C62828" onPress={remove} loading={deleting} disabled={deleting}>
              Remove
            </Button>
          ) : (
            <Button
              onPress={() => {
                onDismiss();
                router.push(`/chat/${pin.owner_id}`);
              }}
            >
              Message
            </Button>
          )}
          <Button icon="directions" onPress={() => Linking.openURL(directionsUrl(position))}>
            Directions
          </Button>
          <Button onPress={onDismiss}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  content: { gap: 8 },
  muted: { opacity: 0.7 },
  actions: { flexWrap: 'wrap' },
});

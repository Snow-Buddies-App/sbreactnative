import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  Dialog,
  HelperText,
  Portal,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';

import { fetchBuddyRequests, otherRider } from '@/lib/api';
import type { PinKind, Profile } from '@/lib/database.types';
import type { LatLng } from '@/lib/openskimap';
import { dropPin, MEET_IN_OPTIONS, PIN_EXPIRY_OPTIONS } from '@/lib/pins';
import { friendlyError } from '@/lib/supabase';
import { useCurrentProfile } from '@/providers/AuthProvider';

type Props = {
  /** Where to drop the pin; null hides the sheet. */
  position: LatLng | null;
  onDismiss: () => void;
  onDropped: (pinId: number) => void;
};

/** Drop a pin or meetup point and choose which buddies get it. */
export function DropPinSheet({ position, onDismiss, onDropped }: Props) {
  const me = useCurrentProfile();
  const [kind, setKind] = useState<PinKind>('meetup');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [meetInMinutes, setMeetInMinutes] = useState<number>(30);
  const [expiresInHours, setExpiresInHours] = useState<number>(24);
  const [buddies, setBuddies] = useState<Profile[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [postInChat, setPostInChat] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = position !== null;

  useEffect(() => {
    if (!visible) return;
    let active = true;
    fetchBuddyRequests()
      .then((requests) => {
        if (!active) return;
        const list = requests
          .filter((r) => r.status === 'accepted')
          .map((r) => otherRider(me.id, r))
          .sort((a, b) => a.display_name.localeCompare(b.display_name));
        setBuddies(list);
        // Default: everyone. Riders untick who shouldn't get it.
        setSelected(new Set(list.map((b) => b.id)));
      })
      .catch((e) => active && setError(friendlyError(e)));
    return () => {
      active = false;
    };
  }, [visible, me.id]);

  const reset = () => {
    setTitle('');
    setNote('');
    setError(null);
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    if (!position) return;
    if (!title.trim()) {
      setError(kind === 'meetup' ? 'Name the meetup spot' : 'Give the pin a name');
      return;
    }
    if (selected.size === 0) {
      setError('Choose at least one buddy');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = await dropPin({
        kind,
        title,
        note,
        position,
        meetAt: kind === 'meetup' ? new Date(Date.now() + meetInMinutes * 60_000) : null,
        expiresInHours,
        viewerIds: [...selected],
        postInChat,
      });
      reset();
      onDropped(id);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{kind === 'meetup' ? 'Set a meetup point' : 'Drop a pin'}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <SegmentedButtons
              value={kind}
              onValueChange={(v) => setKind(v as PinKind)}
              buttons={[
                { value: 'meetup', label: 'Meetup', icon: 'flag-checkered' },
                { value: 'pin', label: 'Pin', icon: 'map-marker' },
              ]}
            />
            <TextInput
              mode="outlined"
              label={kind === 'meetup' ? 'Where? (e.g. Eagle’s Nest lodge)' : 'What’s here? (e.g. Powder stash)'}
              value={title}
              onChangeText={setTitle}
              maxLength={60}
            />
            <TextInput
              mode="outlined"
              label="Note (optional)"
              value={note}
              onChangeText={setNote}
              maxLength={280}
              multiline
            />

            <Text variant="labelLarge">{kind === 'meetup' ? 'When' : 'Keep it on the map for'}</Text>
            <View style={styles.chips}>
              {kind === 'meetup'
                ? MEET_IN_OPTIONS.map((o) => (
                    <Chip
                      key={o.minutes}
                      selected={meetInMinutes === o.minutes}
                      showSelectedOverlay
                      onPress={() => setMeetInMinutes(o.minutes)}
                    >
                      {o.label}
                    </Chip>
                  ))
                : PIN_EXPIRY_OPTIONS.map((o) => (
                    <Chip
                      key={o.hours}
                      selected={expiresInHours === o.hours}
                      showSelectedOverlay
                      onPress={() => setExpiresInHours(o.hours)}
                    >
                      {o.label}
                    </Chip>
                  ))}
            </View>

            <Text variant="labelLarge">Share with</Text>
            {buddies === null && !error && <Text style={styles.muted}>Loading buddies…</Text>}
            {buddies?.length === 0 && <Text style={styles.muted}>Add buddies to share pins with them.</Text>}
            <View style={styles.chips}>
              {buddies?.map((b) => (
                <Chip key={b.id} selected={selected.has(b.id)} showSelectedOverlay onPress={() => toggle(b.id)}>
                  {b.display_name}
                </Chip>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text variant="bodyMedium">Also send in chat</Text>
              <Switch value={postInChat} onValueChange={setPostInChat} />
            </View>
            <Text variant="bodySmall" style={styles.muted}>
              Tip: long-press anywhere on the map to drop a pin there.
            </Text>
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button mode="contained" onPress={submit} loading={saving} disabled={saving}>
            {kind === 'meetup' ? 'Share meetup' : 'Drop pin'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { maxHeight: '90%' },
  scrollArea: { paddingHorizontal: 0 },
  content: { paddingHorizontal: 24, paddingVertical: 12, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { opacity: 0.7 },
});

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Vibration, View } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';

import { RiderAvatar } from '@/components/RiderAvatar';
import { answerCall, declineCall, fetchCall, RING_TIMEOUT_MS, subscribeToMyCalls } from '@/lib/calls';
import type { CallWithPeople } from '@/lib/calls';
import { supabase } from '@/lib/supabase';

/** Shows an incoming-call screen whenever a buddy calls while the app is open. */
export function CallProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [incoming, setIncoming] = useState<CallWithPeople | null>(null);
  const [busy, setBusy] = useState(false);
  const incomingRef = useRef<CallWithPeople | null>(null);
  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  useEffect(() => {
    const channel = subscribeToMyCalls((call) => {
      const current = incomingRef.current;
      if (current && call.id === current.id && call.status !== 'ringing') {
        setIncoming(null); // Caller hung up, or answered on another device.
        return;
      }
      const fresh = Date.now() - new Date(call.created_at).getTime() < RING_TIMEOUT_MS;
      if (call.callee_id === userId && call.status === 'ringing' && fresh && !current) {
        fetchCall(call.id)
          .then((full) => full?.status === 'ringing' && setIncoming(full))
          .catch(() => {});
      }
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Ring (vibrate) until answered, declined, or timed out.
  useEffect(() => {
    if (!incoming) return;
    Vibration.vibrate([0, 800, 1200], true);
    const remaining = RING_TIMEOUT_MS - (Date.now() - new Date(incoming.created_at).getTime());
    const timeout = setTimeout(() => setIncoming(null), Math.max(0, remaining));
    return () => {
      Vibration.cancel();
      clearTimeout(timeout);
    };
  }, [incoming]);

  const accept = async () => {
    if (!incoming) return;
    setBusy(true);
    try {
      await answerCall(incoming.id);
      router.push(`/call/${incoming.id}`);
    } catch {
      // Already over: just close the screen.
    } finally {
      setBusy(false);
      setIncoming(null);
    }
  };

  const decline = async () => {
    if (!incoming) return;
    const id = incoming.id;
    setIncoming(null);
    await declineCall(id).catch(() => {});
  };

  return (
    <>
      {children}
      <Portal>
        <Modal visible={!!incoming} dismissable={false} contentContainerStyle={styles.modal}>
          {incoming && (
            <View style={styles.content}>
              <RiderAvatar id={incoming.caller.id} name={incoming.caller.display_name} size={96} />
              <Text variant="headlineSmall">{incoming.caller.display_name}</Text>
              <Text variant="bodyLarge" style={styles.muted}>
                Incoming {incoming.kind === 'video' ? 'video' : 'voice'} call…
              </Text>
              <View style={styles.actions}>
                <Button mode="contained" icon="phone-hangup" buttonColor="#C62828" onPress={decline} disabled={busy}>
                  Decline
                </Button>
                <Button
                  mode="contained"
                  icon={incoming.kind === 'video' ? 'video' : 'phone'}
                  buttonColor="#2E9E4F"
                  onPress={accept}
                  loading={busy}
                  disabled={busy}
                >
                  Accept
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  modal: { margin: 24, padding: 32, borderRadius: 24, backgroundColor: '#FFFFFF' },
  content: { alignItems: 'center', gap: 12 },
  muted: { opacity: 0.7 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 16 },
});

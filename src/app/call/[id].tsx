import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CallRoomProps } from '@/components/call/CallRoom.types';
import { RiderAvatar } from '@/components/RiderAvatar';
import { LoadingView } from '@/components/StateViews';
import { callsSupported, endCall, fetchCall, fetchCallToken, RING_TIMEOUT_MS, subscribeToMyCalls } from '@/lib/calls';
import type { CallWithPeople } from '@/lib/calls';
import { friendlyError, supabase } from '@/lib/supabase';
import { useCurrentProfile } from '@/providers/AuthProvider';

const ENDED_LABEL = { declined: 'Call declined', missed: 'No answer', ended: 'Call ended' } as const;

/** Required conditionally so Expo Go and web never touch the native WebRTC module. */
const CallRoom: ComponentType<CallRoomProps> | null = callsSupported()
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/components/call/CallRoom').default
  : null;

export default function CallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useCurrentProfile();
  const [call, setCall] = useState<CallWithPeople | null>(null);
  const [connection, setConnection] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCaller = call?.caller_id === me.id;
  const other = call ? (isCaller ? call.callee : call.caller) : null;
  const status = call?.status;
  const live = status === 'ringing' || status === 'active';

  useEffect(() => {
    fetchCall(id)
      .then((c) => (c ? setCall(c) : setError('This call no longer exists.')))
      .catch((e) => setError(friendlyError(e)));
    const channel = subscribeToMyCalls((update) => {
      if (update.id === id) setCall((prev) => (prev ? { ...prev, ...update } : prev));
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id]);

  // Join the media room: the caller right away, the callee once answered.
  const canJoin = !!CallRoom && (status === 'active' || (status === 'ringing' && isCaller));
  useEffect(() => {
    if (!canJoin || connection) return;
    fetchCallToken(id)
      .then(setConnection)
      .catch((e) => setError(friendlyError(e)));
  }, [canJoin, connection, id]);

  // Give up if nobody answers.
  useEffect(() => {
    if (!call || call.status !== 'ringing' || !isCaller) return;
    const remaining = RING_TIMEOUT_MS - (Date.now() - new Date(call.created_at).getTime());
    const timer = setTimeout(() => void endCall(id).catch(() => {}), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [call, isCaller, id]);

  // Leave the screen shortly after the call is over.
  useEffect(() => {
    if (!status || live) return;
    const timer = setTimeout(() => router.back(), 1500);
    return () => clearTimeout(timer);
  }, [status, live]);

  const hangUp = () => {
    void endCall(id).catch(() => {});
    if (router.canGoBack()) router.back();
  };

  if (!call && !error) return <LoadingView />;

  const header = <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />;

  if (call && live && CallRoom && connection) {
    return (
      <>
        {header}
        <CallRoom
          url={connection.url}
          token={connection.token}
          video={call.kind === 'video'}
          otherName={other?.display_name ?? ''}
          waiting={status === 'ringing'}
          onHangUp={hangUp}
        />
      </>
    );
  }

  let message: string;
  if (error) message = error;
  else if (status && !live) message = ENDED_LABEL[status as keyof typeof ENDED_LABEL] ?? 'Call ended';
  else if (!CallRoom)
    message = 'Voice and video calls work in the Snow Buddies app build. They aren’t available in this preview.';
  else message = status === 'ringing' && !isCaller ? 'Connecting…' : 'Calling…';

  return (
    <SafeAreaView style={styles.container}>
      {header}
      <View style={styles.center}>
        {other && <RiderAvatar id={other.id} name={other.display_name} size={96} />}
        {other && (
          <Text variant="headlineSmall" style={styles.light}>
            {other.display_name}
          </Text>
        )}
        <Text variant="bodyLarge" style={[styles.light, styles.dim]}>
          {message}
        </Text>
      </View>
      <Button
        mode="contained"
        icon="phone-hangup"
        buttonColor="#C62828"
        style={styles.hangUp}
        onPress={live ? hangUp : () => router.back()}
      >
        {live ? 'Hang up' : 'Close'}
      </Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1F33', justifyContent: 'space-between', padding: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  light: { color: '#FFFFFF', textAlign: 'center' },
  dim: { opacity: 0.75 },
  hangUp: { alignSelf: 'center', marginBottom: 24 },
});

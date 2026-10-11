import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { HelperText, IconButton, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/chat/MessageBubble';
import { VoiceRecorder } from '@/components/chat/VoiceRecorder';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { fetchMessages, fetchRider, markConversationRead, sendMessage, subscribeToIncomingMessages } from '@/lib/api';
import type { ChatMessage, Rider } from '@/lib/api';
import { startCall, subscribeToMyCalls } from '@/lib/calls';
import type { CallKind } from '@/lib/database.types';
import { friendlyError, supabase } from '@/lib/supabase';
import { sendVoiceMessage, uploadVoiceNote } from '@/lib/voice';
import { useCurrentProfile } from '@/providers/AuthProvider';
import theme from '@/theme';

export default function ChatScreen() {
  const { id: otherId } = useLocalSearchParams<{ id: string }>();
  const me = useCurrentProfile();
  const insets = useSafeAreaInsets();
  const [rider, setRider] = useState<Rider | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([fetchRider(otherId), fetchMessages(me.id, otherId)])
      .then(([other, history]) => {
        if (!active) return;
        setRider(other);
        setMessages(history);
        setError(null);
        void markConversationRead(otherId).catch(() => {});
      })
      .catch((e) => active && setError(friendlyError(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [me.id, otherId, attempt]);

  const retry = () => {
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  // Re-fetch quietly, e.g. to pick up call outcomes shown in the thread.
  const refreshMessages = useCallback(() => {
    fetchMessages(me.id, otherId)
      .then(setMessages)
      .catch(() => {});
  }, [me.id, otherId]);

  useEffect(() => {
    const messagesChannel = subscribeToIncomingMessages(me.id, (message) => {
      if (message.sender_id !== otherId) return;
      if (message.kind === 'text' || message.kind === 'voice') {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      } else {
        refreshMessages();
      }
      void markConversationRead(otherId).catch(() => {});
    });
    const callsChannel = subscribeToMyCalls(() => refreshMessages());
    return () => {
      void supabase.removeChannel(messagesChannel);
      void supabase.removeChannel(callsChannel);
    };
  }, [me.id, otherId, refreshMessages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const message = await sendMessage(otherId, body);
      setMessages((prev) => [...prev, message]);
      setDraft('');
    } catch (e) {
      setSendError(friendlyError(e));
    } finally {
      setSending(false);
    }
  };

  const sendVoice = async (uri: string, durationMs: number) => {
    setSending(true);
    setSendError(null);
    try {
      const path = await uploadVoiceNote(uri, me.id);
      const message = await sendVoiceMessage(otherId, path, durationMs);
      setMessages((prev) => [...prev, message]);
    } catch (e) {
      setSendError(friendlyError(e));
    } finally {
      setSending(false);
    }
  };

  const call = async (kind: CallKind) => {
    setSendError(null);
    try {
      const callId = await startCall(otherId, kind);
      refreshMessages();
      router.push(`/call/${callId}`);
    } catch (e) {
      setSendError(friendlyError(e));
    }
  };

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={retry} />;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: rider?.display_name ?? 'Chat',
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton icon="phone" onPress={() => void call('voice')} accessibilityLabel="Voice call" />
              <IconButton icon="video" onPress={() => void call('video')} accessibilityLabel="Video call" />
            </View>
          ),
        }}
      />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <EmptyView icon="message-text-outline" title="No messages yet" body="Plan your next powder day!" />
        }
        renderItem={({ item }) => <MessageBubble message={item} mine={item.sender_id === me.id} />}
      />
      <HelperText type="error" visible={!!sendError} style={styles.sendError}>
        {sendError}
      </HelperText>
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {!recording && (
          <TextInput
            mode="outlined"
            placeholder="Message"
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
            style={styles.input}
            dense
          />
        )}
        {sending ? (
          <ActivityIndicator style={styles.spinner} color={theme.colors.primary} />
        ) : draft.trim() ? (
          <IconButton icon="send" mode="contained" onPress={send} accessibilityLabel="Send message" />
        ) : (
          <VoiceRecorder
            onRecorded={(uri, ms) => void sendVoice(uri, ms)}
            onError={setSendError}
            onRecordingChange={setRecording}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 12, gap: 6, flexGrow: 1 },
  headerActions: { flexDirection: 'row' },
  sendError: { paddingHorizontal: 12 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 4,
    backgroundColor: theme.colors.surface,
  },
  input: { flex: 1, maxHeight: 120 },
  spinner: { margin: 14 },
});

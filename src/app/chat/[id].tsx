import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { fetchMessages, fetchRider, markConversationRead, sendMessage, subscribeToIncomingMessages } from '@/lib/api';
import type { Rider } from '@/lib/api';
import type { Message } from '@/lib/database.types';
import { formatMessageTime } from '@/lib/dates';
import { friendlyError, supabase } from '@/lib/supabase';
import { useCurrentProfile } from '@/providers/AuthProvider';
import theme from '@/theme';

export default function ChatScreen() {
  const { id: otherId } = useLocalSearchParams<{ id: string }>();
  const me = useCurrentProfile();
  const insets = useSafeAreaInsets();
  const [rider, setRider] = useState<Rider | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

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

  useEffect(() => {
    const channel = subscribeToIncomingMessages(me.id, (message) => {
      if (message.sender_id !== otherId) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      void markConversationRead(otherId).catch(() => {});
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me.id, otherId]);

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

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={retry} />;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ title: rider?.display_name ?? 'Chat' }} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <EmptyView icon="message-text-outline" title="No messages yet" body="Plan your next powder day!" />
        }
        renderItem={({ item }) => {
          const mine = item.sender_id === me.id;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={mine ? styles.mineText : undefined}>{item.body}</Text>
              <Text variant="labelSmall" style={[styles.time, mine && styles.mineText]}>
                {formatMessageTime(item.created_at)}
              </Text>
            </View>
          );
        }}
      />
      <HelperText type="error" visible={!!sendError} style={styles.sendError}>
        {sendError}
      </HelperText>
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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
        <IconButton
          icon="send"
          mode="contained"
          onPress={send}
          disabled={!draft.trim() || sending}
          accessibilityLabel="Send message"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 12, gap: 6, flexGrow: 1 },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.colors.surfaceVariant },
  mineText: { color: '#FFFFFF' },
  time: { opacity: 0.7, marginTop: 2, alignSelf: 'flex-end' },
  sendError: { paddingHorizontal: 12 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 4,
    backgroundColor: theme.colors.surface,
  },
  input: { flex: 1, maxHeight: 120 },
});

import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';

import type { ChatMessage } from '@/lib/api';
import { formatMessageTime } from '@/lib/dates';
import { formatDuration } from '@/lib/voice';
import theme from '@/theme';

import { VoiceNotePlayer } from './VoiceNotePlayer';

const CALL_STATUS_LABEL = {
  ringing: 'Ringing…',
  active: 'In progress',
  declined: 'Declined',
  missed: 'Missed',
  ended: 'Ended',
} as const;

function callSummary(message: ChatMessage, mine: boolean): string {
  const call = message.call;
  const kind = call?.kind === 'video' ? 'Video call' : 'Voice call';
  if (!call) return kind;
  if (call.status === 'missed') return mine ? `${kind} · No answer` : `Missed ${kind.toLowerCase()}`;
  if (call.status === 'ended' && call.answered_at && call.ended_at) {
    const ms = new Date(call.ended_at).getTime() - new Date(call.answered_at).getTime();
    return `${kind} · ${formatDuration(ms)}`;
  }
  return `${kind} · ${CALL_STATUS_LABEL[call.status]}`;
}

export function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const textColor = mine ? '#FFFFFF' : theme.colors.onSurface;
  const time = (
    <Text variant="labelSmall" style={[styles.time, { color: textColor }]}>
      {formatMessageTime(message.created_at)}
    </Text>
  );

  let content;
  switch (message.kind) {
    case 'voice':
      content = message.attachment_path ? (
        <VoiceNotePlayer path={message.attachment_path} durationMs={message.duration_ms} tint={textColor} />
      ) : (
        <Text style={{ color: textColor }}>Voice message unavailable</Text>
      );
      break;
    case 'pin':
      content = (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: textColor }]}>{message.body}</Text>
          {message.pin_id ? (
            <Button
              compact
              mode={mine ? 'contained-tonal' : 'contained'}
              icon="map"
              onPress={() => router.push(`/pin/${message.pin_id}`)}
            >
              Open map
            </Button>
          ) : (
            <Text variant="bodySmall" style={{ color: textColor, opacity: 0.8 }}>
              This pin was removed.
            </Text>
          )}
        </View>
      );
      break;
    case 'call':
      content = (
        <View style={styles.callRow}>
          <Icon source={message.call?.kind === 'video' ? 'video' : 'phone'} size={18} color={textColor} />
          <Text style={{ color: textColor }}>{callSummary(message, mine)}</Text>
        </View>
      );
      break;
    default:
      content = <Text style={{ color: textColor }}>{message.body}</Text>;
  }

  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      {content}
      {time}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.colors.surfaceVariant },
  time: { opacity: 0.7, marginTop: 2, alignSelf: 'flex-end' },
  card: { gap: 8 },
  cardTitle: { fontWeight: '600' },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

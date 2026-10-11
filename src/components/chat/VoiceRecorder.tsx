import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { formatDuration, MAX_VOICE_NOTE_MS } from '@/lib/voice';

type Props = {
  /** Called with the finished recording. */
  onRecorded: (uri: string, durationMs: number) => void;
  onError: (message: string) => void;
  /** Lets the composer hide the text field while recording. */
  onRecordingChange?: (recording: boolean) => void;
  disabled?: boolean;
};

/** Mic button that turns into a recording bar (cancel / timer / send). */
export function VoiceRecorder({ onRecorded, onError, onRecordingChange, disabled }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecordingState] = useState(false);
  const setRecording = (value: boolean) => {
    setRecordingState(value);
    onRecordingChange?.(value);
  };
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  const finish = async (send: boolean) => {
    setRecording(false);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const durationMs = Date.now() - startedAt.current;
      if (send && recorder.uri && durationMs > 500) onRecorded(recorder.uri, durationMs);
    } catch {
      onError('Recording failed. Please try again.');
    }
  };

  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);
      if (ms >= MAX_VOICE_NOTE_MS) void finishRef.current(true);
    }, 250);
    return () => clearInterval(timer);
  }, [recording]);

  const start = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        onError('Allow microphone access to send voice messages.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setElapsed(0);
      setRecording(true);
    } catch {
      onError('Could not start recording.');
    }
  };

  if (!recording) {
    return (
      <IconButton
        icon="microphone"
        mode="contained-tonal"
        onPress={start}
        disabled={disabled}
        accessibilityLabel="Record a voice message"
      />
    );
  }

  return (
    <View style={styles.bar}>
      <IconButton icon="delete" onPress={() => finish(false)} accessibilityLabel="Cancel recording" />
      <View style={styles.dot} />
      <Text variant="titleMedium" style={styles.timer}>
        {formatDuration(elapsed)}
      </Text>
      <IconButton icon="send" mode="contained" onPress={() => finish(true)} accessibilityLabel="Send voice message" />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C62828', marginRight: 8 },
  timer: { flex: 1 },
});

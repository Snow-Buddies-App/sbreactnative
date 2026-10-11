import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, ProgressBar, Text } from 'react-native-paper';

import { formatDuration, voiceNoteUrl } from '@/lib/voice';

type Props = { path: string; durationMs: number | null; tint: string };

/** Play/pause control for a voice note. The audio URL is fetched on first play. */
export function VoiceNotePlayer({ path, durationMs, tint }: Props) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const total = status.duration > 0 ? status.duration * 1000 : (durationMs ?? 0);
  const position = status.currentTime * 1000;
  const progress = total > 0 ? Math.min(1, position / total) : 0;

  const toggle = async () => {
    try {
      if (!loaded) {
        setLoading(true);
        player.replace({ uri: await voiceNoteUrl(path) });
        setLoaded(true);
        setLoading(false);
        player.play();
        return;
      }
      if (status.playing) {
        player.pause();
      } else {
        if (status.didJustFinish || (total > 0 && position >= total - 100)) await player.seekTo(0);
        player.play();
      }
    } catch {
      setLoading(false);
      setFailed(true);
    }
  };

  return (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator size={20} color={tint} style={styles.spinner} />
      ) : (
        <IconButton
          icon={status.playing ? 'pause' : 'play'}
          iconColor={tint}
          size={22}
          onPress={toggle}
          accessibilityLabel={status.playing ? 'Pause voice message' : 'Play voice message'}
        />
      )}
      <View style={styles.track}>
        <ProgressBar progress={progress} color={tint} style={styles.bar} />
        <Text variant="labelSmall" style={{ color: tint }}>
          {failed ? 'Could not play' : formatDuration(status.playing || position > 0 ? position : total)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minWidth: 180 },
  spinner: { margin: 12 },
  track: { flex: 1, gap: 4, paddingRight: 8 },
  bar: { height: 3, borderRadius: 2, backgroundColor: 'rgba(127,127,127,0.3)' },
});

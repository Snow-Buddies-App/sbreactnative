import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';

import type { SkiMapProps } from './SkiMap';

/** react-native-maps is native-only; on web, link out to OpenSkiMap instead. */
export function SkiMap({ center, title, data }: SkiMapProps) {
  const url = `https://openskimap.org/#13/${center.latitude.toFixed(4)}/${center.longitude.toFixed(4)}`;
  return (
    <View style={styles.container}>
      <Icon source="map-search-outline" size={48} />
      <Text variant="titleMedium">{title}</Text>
      {data && (
        <Text variant="bodyMedium">
          {data.runs.length} runs · {data.lifts.length} lifts
        </Text>
      )}
      <Text variant="bodySmall" style={styles.muted}>
        The interactive ski map is available in the iOS and Android apps.
      </Text>
      <Button mode="contained" icon="open-in-new" onPress={() => window.open(url, '_blank')}>
        Open on OpenSkiMap
      </Button>
    </View>
  );
}

export type { SkiMapProps };

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  muted: { opacity: 0.7, textAlign: 'center' },
});

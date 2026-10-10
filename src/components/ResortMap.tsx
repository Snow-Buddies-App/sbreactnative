import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, Surface, Text } from 'react-native-paper';

import { SkiMap } from '@/components/SkiMap';
import { useUserLocation } from '@/hooks/useUserLocation';
import type { LatLng, SkiMapData } from '@/lib/openskimap';
import { distanceKm, fetchSkiMap, LIFT_COLOR, RUN_COLORS } from '@/lib/openskimap';

const LEGEND = [
  { label: 'Easy', color: RUN_COLORS.easy },
  { label: 'Intermediate', color: RUN_COLORS.intermediate },
  { label: 'Advanced', color: RUN_COLORS.advanced },
  { label: 'Freeride', color: RUN_COLORS.freeride },
  { label: 'Lift', color: LIFT_COLOR },
];

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

/** A resort's trail map (runs + lifts from OpenSkiMap) with the rider's location. */
export function ResortMap({ name, center }: { name: string; center: LatLng }) {
  // The trail map result, tagged with the centre it was loaded for.
  const [result, setResult] = useState<{ center: LatLng; data?: SkiMapData; error?: string } | null>(null);
  const { location, status } = useUserLocation();

  useEffect(() => {
    const controller = new AbortController();
    fetchSkiMap(center, controller.signal)
      .then((data) => setResult({ center, data }))
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ center, error: e instanceof Error ? e.message : 'Could not load the trail map' });
        }
      });
    return () => controller.abort();
  }, [center]);

  const current = result?.center === center ? result : null;
  const loading = current === null;
  const data = current?.data ?? null;
  const error = current?.error ?? null;

  const distance = location ? distanceKm(location, center) : null;

  return (
    <View style={styles.flex}>
      <SkiMap center={center} title={name} data={data} userLocation={location} />

      <Surface style={styles.infoCard} elevation={2}>
        <Text variant="titleSmall">{name}</Text>
        <Text variant="bodySmall" style={styles.muted}>
          {distance !== null
            ? distance < 3
              ? "You're on the mountain"
              : `${formatDistance(distance)} away`
            : status === 'denied'
              ? 'Location off — enable it to see yourself on the map'
              : status === 'pending'
                ? 'Finding your location…'
                : 'Location unavailable'}
        </Text>
        {loading && <ActivityIndicator size="small" style={styles.spinner} />}
        {error && (
          <Text variant="bodySmall" style={styles.error}>
            {error}
          </Text>
        )}
        {data && !loading && (
          <Text variant="bodySmall" style={styles.muted}>
            {data.runs.length} runs · {data.lifts.length} lifts
          </Text>
        )}
      </Surface>

      <View style={styles.legend} pointerEvents="none">
        {LEGEND.map((item) => (
          <Chip key={item.label} compact style={styles.legendChip} textStyle={styles.legendText}>
            <Text style={{ color: item.color }}>■ </Text>
            {item.label}
          </Chip>
        ))}
        <Text style={styles.attribution}>© OpenStreetMap contributors · OpenSkiMap</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  infoCard: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    padding: 12,
    borderRadius: 12,
    gap: 2,
  },
  muted: { opacity: 0.75 },
  spinner: { alignSelf: 'flex-start', marginTop: 4 },
  error: { color: '#C62828' },
  legend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    gap: 4,
    alignItems: 'flex-start',
  },
  legendChip: { backgroundColor: 'rgba(255,255,255,0.92)' },
  legendText: { fontSize: 11 },
  attribution: { fontSize: 10, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 4 },
});

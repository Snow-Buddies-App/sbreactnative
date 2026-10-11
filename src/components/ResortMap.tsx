import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, Surface, Text } from 'react-native-paper';

import { DropPinSheet } from '@/components/DropPinSheet';
import { LocationSharingSheet } from '@/components/LocationSharingSheet';
import { PinDetailsSheet } from '@/components/PinDetailsSheet';
import { SkiMap } from '@/components/SkiMap';
import { useFriendLocations } from '@/hooks/useFriendLocations';
import { usePins } from '@/hooks/usePins';
import { useUserLocation } from '@/hooks/useUserLocation';
import { formatUntil } from '@/lib/locationSharing';
import type { LatLng, SkiMapData } from '@/lib/openskimap';
import { distanceKm, fetchSkiMap, LIFT_COLOR, RUN_COLORS } from '@/lib/openskimap';
import type { PinWithOwner } from '@/lib/pins';
import { useCurrentProfile } from '@/providers/AuthProvider';
import { useLocationSharing } from '@/providers/LocationSharingProvider';

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

type Props = {
  name: string;
  center: LatLng;
  /** Open this pin's details once pins have loaded (e.g. from a chat card). */
  focusPinId?: number;
};

/** A resort's trail map (runs + lifts from OpenSkiMap) with me, buddies and shared pins. */
export function ResortMap({ name, center, focusPinId }: Props) {
  // The trail map result, tagged with the centre it was loaded for.
  const [result, setResult] = useState<{ center: LatLng; data?: SkiMapData; error?: string } | null>(null);
  const { location, status } = useUserLocation();
  const me = useCurrentProfile();
  const { friends } = useFriendLocations(me.id);
  const { sharingUntil } = useLocationSharing();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { pins, reload: reloadPins } = usePins();
  const [dropAt, setDropAt] = useState<LatLng | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<number | null>(focusPinId ?? null);
  const selectedPin: PinWithOwner | null = pins.find((p) => p.id === selectedPinId) ?? null;

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
      <SkiMap
        center={center}
        title={name}
        data={data}
        userLocation={location}
        friends={friends}
        onFriendPress={(id) => router.push(`/chat/${id}`)}
        pins={pins}
        onPinPress={(pin) => setSelectedPinId(pin.id)}
        onDropPin={setDropAt}
      />

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
        <View style={styles.sharingRow}>
          <Chip
            compact
            icon={sharingUntil ? 'map-marker-account' : 'map-marker-off'}
            selected={!!sharingUntil}
            showSelectedOverlay
            onPress={() => setSheetOpen(true)}
          >
            {sharingUntil ? `Sharing until ${formatUntil(sharingUntil)}` : 'Share my location'}
          </Chip>
          <Chip compact icon="account-group">
            {friends.length === 1 ? '1 buddy on map' : `${friends.length} buddies on map`}
          </Chip>
        </View>
      </Surface>
      <LocationSharingSheet visible={sheetOpen} onDismiss={() => setSheetOpen(false)} />
      <DropPinSheet
        position={dropAt}
        onDismiss={() => setDropAt(null)}
        onDropped={(id) => {
          setDropAt(null);
          reloadPins();
          setSelectedPinId(id);
        }}
      />
      <PinDetailsSheet
        pin={selectedPin}
        userLocation={location}
        onDismiss={() => setSelectedPinId(null)}
        onDeleted={() => {
          setSelectedPinId(null);
          reloadPins();
        }}
      />

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
    zIndex: 1100,
  },
  sharingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  muted: { opacity: 0.75 },
  spinner: { alignSelf: 'flex-start', marginTop: 4 },
  error: { color: '#C62828' },
  legend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    gap: 4,
    alignItems: 'flex-start',
    zIndex: 1100,
  },
  legendChip: { backgroundColor: 'rgba(255,255,255,0.92)' },
  legendText: { fontSize: 11 },
  attribution: { fontSize: 10, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 4 },
});

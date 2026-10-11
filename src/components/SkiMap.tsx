import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { FAB } from 'react-native-paper';

import { RiderAvatar } from '@/components/RiderAvatar';
import { formatLastSeen } from '@/lib/locationSharing';
import { formatMeetTime } from '@/lib/pins';
import type { LatLng } from '@/lib/openskimap';
import { LIFT_COLOR, runColor } from '@/lib/openskimap';

import type { SkiMapProps } from './SkiMap.types';

export type { SkiMapProps };

const DELTA = { latitudeDelta: 0.06, longitudeDelta: 0.06 };
const EDGE_PADDING = { top: 140, right: 60, bottom: 160, left: 60 };

/** Native map: OpenSkiMap runs and lifts, my GPS dot, and buddies sharing with me. */
export function SkiMap({
  center,
  title,
  data,
  userLocation,
  friends,
  onFriendPress,
  pins,
  onPinPress,
  onDropPin,
}: SkiMapProps) {
  const mapRef = useRef<MapView>(null);

  const goTo = (point: LatLng, delta = DELTA) => mapRef.current?.animateToRegion({ ...point, ...delta }, 600);

  const showEveryone = () => {
    const points: LatLng[] = friends.map((f) => ({ latitude: f.latitude, longitude: f.longitude }));
    if (userLocation) points.push(userLocation);
    if (points.length === 1) goTo(points[0], { latitudeDelta: 0.02, longitudeDelta: 0.02 });
    else mapRef.current?.fitToCoordinates(points, { edgePadding: EDGE_PADDING, animated: true });
  };

  const dropPinHere = async () => {
    if (userLocation) return onDropPin(userLocation);
    const camera = await mapRef.current?.getCamera();
    onDropPin(camera?.center ?? center);
  };

  return (
    <View style={styles.flex}>
      <MapView
        ref={mapRef}
        onLongPress={(e) => onDropPin(e.nativeEvent.coordinate)}
        style={styles.flex}
        initialRegion={{ ...center, ...DELTA }}
        mapType="terrain"
        showsUserLocation
        showsCompass
        showsScale
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <Marker coordinate={center} title={title} pinColor="#04448C" />
        {data?.runs.flatMap((run) =>
          run.lines.map((line, i) => (
            <Polyline
              key={`run-${run.id}-${i}`}
              coordinates={line}
              strokeColor={runColor(run.difficulty)}
              strokeWidth={3}
              tappable={false}
            />
          )),
        )}
        {data?.lifts.flatMap((lift) =>
          lift.lines.map((line, i) => (
            <Polyline
              key={`lift-${lift.id}-${i}`}
              coordinates={line}
              strokeColor={LIFT_COLOR}
              strokeWidth={2}
              lineDashPattern={[6, 4]}
              tappable={false}
            />
          )),
        )}
        {pins.map((pin) => (
          <Marker
            key={`pin-${pin.id}`}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            pinColor={pin.kind === 'meetup' ? 'green' : 'orange'}
            title={pin.title}
            description={
              pin.kind === 'meetup' && pin.meet_at ? `Meet at ${formatMeetTime(pin.meet_at)}` : pin.note ?? undefined
            }
            onPress={() => onPinPress(pin)}
          />
        ))}
        {friends.map((friend) => (
          <Marker
            key={friend.userId}
            coordinate={{ latitude: friend.latitude, longitude: friend.longitude }}
            title={friend.name}
            description={`Updated ${formatLastSeen(friend.updatedAt)} · Tap to message`}
            onCalloutPress={() => onFriendPress(friend.userId)}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.friendMarker}>
              <View style={styles.friendRing}>
                <RiderAvatar id={friend.userId} name={friend.name} size={34} />
              </View>
              <Text style={styles.friendName} numberOfLines={1}>
                {friend.name}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>
      <View style={styles.fabs}>
        <FAB small icon="map-marker-plus" accessibilityLabel="Drop a pin" onPress={dropPinHere} />
        {friends.length > 0 && (
          <FAB small icon="account-group" accessibilityLabel="Show my buddies" onPress={showEveryone} />
        )}
        <FAB small icon="image-filter-hdr" accessibilityLabel="Center on resort" onPress={() => goTo(center)} />
        {userLocation && (
          <FAB
            small
            icon="crosshairs-gps"
            accessibilityLabel="Center on my location"
            onPress={() => goTo(userLocation, { latitudeDelta: 0.015, longitudeDelta: 0.015 })}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fabs: { position: 'absolute', right: 12, bottom: 12, gap: 10 },
  friendMarker: { alignItems: 'center', width: 90 },
  friendRing: { borderRadius: 22, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  friendName: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#04448C',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
});

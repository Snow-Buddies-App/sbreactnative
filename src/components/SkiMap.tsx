import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { FAB } from 'react-native-paper';

import type { LatLng, SkiMapData } from '@/lib/openskimap';
import { LIFT_COLOR, runColor } from '@/lib/openskimap';

export type SkiMapProps = {
  center: LatLng;
  title: string;
  data: SkiMapData | null;
  userLocation: LatLng | null;
};

const DELTA = { latitudeDelta: 0.06, longitudeDelta: 0.06 };

/** Native map with OpenSkiMap runs and lifts drawn over terrain. */
export function SkiMap({ center, title, data, userLocation }: SkiMapProps) {
  const mapRef = useRef<MapView>(null);

  const goTo = (point: LatLng, delta = DELTA) =>
    mapRef.current?.animateToRegion({ ...point, ...delta }, 600);

  return (
    <View style={styles.flex}>
      <MapView
        ref={mapRef}
        style={styles.flex}
        initialRegion={{ ...center, ...DELTA }}
        mapType="terrain"
        showsUserLocation
        showsCompass
        showsScale
        rotateEnabled
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
      </MapView>
      <View style={styles.fabs}>
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
});

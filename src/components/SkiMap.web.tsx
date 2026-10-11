import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMapEvents,
} from 'react-leaflet';
import { FAB } from 'react-native-paper';

import { initials } from '@/lib/labels';
import { formatLastSeen } from '@/lib/locationSharing';
import { formatMeetTime } from '@/lib/pins';
import type { LatLng } from '@/lib/openskimap';
import { LIFT_COLOR, runColor } from '@/lib/openskimap';

import type { SkiMapProps } from './SkiMap.types';

export type { SkiMapProps };

// Swap for a commercial tile provider (MapTiler, Stadia…) before heavy use:
// the public OpenStreetMap tile servers are for light traffic only.
const TILE_URL = process.env.EXPO_PUBLIC_WEB_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Runs &amp; lifts: <a href="https://openskimap.org">OpenSkiMap</a>';

const toLeaflet = (p: LatLng): [number, number] => [p.latitude, p.longitude];

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function friendIcon(name: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `<div style="width:38px;height:38px;border-radius:50%;background:#04448C;border:3px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.4);color:#fff;font:700 14px system-ui,sans-serif;
      display:flex;align-items:center;justify-content:center">${escapeHtml(initials(name))}</div>`,
  });
}

const pinIcons = {
  meetup: L.divIcon({ className: '', iconSize: [32, 32], iconAnchor: [6, 30], html: '<div style="font-size:28px">🚩</div>' }),
  pin: L.divIcon({ className: '', iconSize: [32, 32], iconAnchor: [16, 30], html: '<div style="font-size:28px">📍</div>' }),
};

/** Right-click / long-press (Leaflet "contextmenu") drops a pin. */
function DropPinOnLongPress({ onDropPin }: { onDropPin: (at: LatLng) => void }) {
  useMapEvents({
    contextmenu: (e) => onDropPin({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
  });
  return null;
}

/** Web map (Leaflet + OpenStreetMap tiles) with the same overlays as native. */
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
  const [map, setMap] = useState<L.Map | null>(null);
  const icons = useMemo(() => new Map(friends.map((f) => [f.userId, friendIcon(f.name)])), [friends]);

  useEffect(() => {
    map?.setView(toLeaflet(center), 13);
  }, [map, center]);

  // Leaflet measures its container once; re-measure when the layout changes.
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  const showEveryone = () => {
    const points = friends.map((f) => [f.latitude, f.longitude] as [number, number]);
    if (userLocation) points.push(toLeaflet(userLocation));
    if (points.length === 1) map?.setView(points[0], 15);
    else if (points.length > 1) map?.fitBounds(points, { padding: [80, 80] });
  };

  return (
    <View style={styles.flex}>
      <View style={StyleSheet.absoluteFill}>
        <MapContainer
          ref={setMap}
          center={toLeaflet(center)}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
          <DropPinOnLongPress onDropPin={onDropPin} />
          {data?.runs.flatMap((run) =>
            run.lines.map((line, i) => (
              <Polyline
                key={`run-${run.id}-${i}`}
                positions={line.map(toLeaflet)}
                pathOptions={{ color: runColor(run.difficulty), weight: 3 }}
              >
                {run.name && <Tooltip sticky>{run.name}</Tooltip>}
              </Polyline>
            )),
          )}
          {data?.lifts.flatMap((lift) =>
            lift.lines.map((line, i) => (
              <Polyline
                key={`lift-${lift.id}-${i}`}
                positions={line.map(toLeaflet)}
                pathOptions={{ color: LIFT_COLOR, weight: 2, dashArray: '6 4' }}
              >
                {lift.name && <Tooltip sticky>{lift.name}</Tooltip>}
              </Polyline>
            )),
          )}
          <CircleMarker
            center={toLeaflet(center)}
            radius={6}
            pathOptions={{ color: '#04448C', fillColor: '#04448C', fillOpacity: 1 }}
          >
            <Tooltip>{title}</Tooltip>
          </CircleMarker>
          {userLocation && (
            <CircleMarker
              center={toLeaflet(userLocation)}
              radius={8}
              pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#1E88E5', fillOpacity: 1 }}
            >
              <Tooltip>You</Tooltip>
            </CircleMarker>
          )}
          {pins.map((pin) => (
            <Marker
              key={`pin-${pin.id}`}
              position={[pin.latitude, pin.longitude]}
              icon={pinIcons[pin.kind]}
              eventHandlers={{ click: () => onPinPress(pin) }}
            >
              <Tooltip direction="top" offset={[0, -24]}>
                {pin.title}
                {pin.kind === 'meetup' && pin.meet_at ? ` · ${formatMeetTime(pin.meet_at)}` : ''}
              </Tooltip>
            </Marker>
          ))}
          {friends.map((friend) => (
            <Marker
              key={friend.userId}
              position={[friend.latitude, friend.longitude]}
              icon={icons.get(friend.userId)}
            >
              <Popup>
                <strong>{friend.name}</strong>
                <br />
                Updated {formatLastSeen(friend.updatedAt)}
                <br />
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onFriendPress(friend.userId);
                  }}
                >
                  Message
                </a>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </View>
      <View style={styles.fabs}>
        <FAB
          small
          icon="map-marker-plus"
          accessibilityLabel="Drop a pin"
          onPress={() => {
            const c = map?.getCenter();
            onDropPin(userLocation ?? (c ? { latitude: c.lat, longitude: c.lng } : center));
          }}
        />
        {friends.length > 0 && (
          <FAB small icon="account-group" accessibilityLabel="Show my buddies" onPress={showEveryone} />
        )}
        <FAB
          small
          icon="image-filter-hdr"
          accessibilityLabel="Center on resort"
          onPress={() => map?.setView(toLeaflet(center), 13)}
        />
        {userLocation && (
          <FAB
            small
            icon="crosshairs-gps"
            accessibilityLabel="Center on my location"
            onPress={() => map?.setView(toLeaflet(userLocation), 16)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Leaflet panes use z-index up to 1000.
  fabs: { position: 'absolute', right: 12, bottom: 24, gap: 10, zIndex: 1100 },
});

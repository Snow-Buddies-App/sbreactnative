import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { LatLng } from '@/lib/openskimap';

export type LocationStatus = 'pending' | 'granted' | 'denied' | 'unavailable';

/** Watch the rider's location while the calling screen is mounted. */
export function useUserLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<LocationStatus>('pending');

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (!granted) {
          setStatus('denied');
          return;
        }
        setStatus('granted');
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 15 },
          ({ coords }) => setLocation({ latitude: coords.latitude, longitude: coords.longitude }),
        );
        if (cancelled) subscription.remove();
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return { location, status };
}

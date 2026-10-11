import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import {
  isBackgroundSharingSupported,
  startBackgroundUpdates,
  stopBackgroundUpdates,
} from '@/lib/backgroundLocation';
import { fetchSharingUntil, startSharing, stopSharing, uploadMyLocation } from '@/lib/locationSharing';
import type { PositionUpdate } from '@/lib/locationSharing';

const BACKGROUND_PREF_KEY = 'snowbuddies.shareInBackground';
const MIN_UPLOAD_INTERVAL_MS = 10_000;
const HEARTBEAT_MS = 2 * 60_000;

type LocationSharingValue = {
  /** When sharing ends, or null when not sharing. */
  sharingUntil: Date | null;
  start: (minutes: number) => Promise<void>;
  stop: () => Promise<void>;
  /** Keep sharing while the app is closed (development/store builds only). */
  backgroundSupported: boolean;
  shareInBackground: boolean;
  setShareInBackground: (enabled: boolean) => Promise<void>;
  /** Set if location permission was refused while trying to share. */
  permissionDenied: boolean;
};

const LocationSharingContext = createContext<LocationSharingValue | null>(null);

export function LocationSharingProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [sharingUntil, setSharingUntil] = useState<Date | null>(null);
  const [backgroundSupported, setBackgroundSupported] = useState(false);
  const [shareInBackground, setShareInBackgroundState] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const lastUpload = useRef<{ at: number; position: PositionUpdate } | null>(null);

  const sharing = sharingUntil !== null;

  // Restore state on launch.
  useEffect(() => {
    fetchSharingUntil(userId)
      .then(setSharingUntil)
      .catch(() => {});
    isBackgroundSharingSupported().then(setBackgroundSupported);
    AsyncStorage.getItem(BACKGROUND_PREF_KEY)
      .then((value) => setShareInBackgroundState(value === 'true'))
      .catch(() => {});
  }, [userId]);

  const upload = useCallback(async (position: PositionUpdate, force = false) => {
    const now = Date.now();
    if (!force && lastUpload.current && now - lastUpload.current.at < MIN_UPLOAD_INTERVAL_MS) return;
    lastUpload.current = { at: now, position };
    try {
      const stillSharing = await uploadMyLocation(position);
      if (!stillSharing) setSharingUntil(null);
    } catch {
      // Offline: the next position or heartbeat retries.
    }
  }, []);

  // While sharing and the app is open: watch GPS and upload, with a heartbeat
  // so buddies don't see a stale position while standing in a lift line.
  useEffect(() => {
    if (!sharing) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      setPermissionDenied(!granted);
      if (!granted) return;
      const watch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 10_000 },
        ({ coords }) =>
          void upload({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
          }),
      );
      if (cancelled) watch.remove();
      else subscription = watch;
    })().catch(() => {});

    const heartbeat = setInterval(() => {
      if (lastUpload.current) void upload(lastUpload.current.position, true);
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      subscription?.remove();
      clearInterval(heartbeat);
    };
  }, [sharing, upload]);

  // End sharing locally when the time runs out (the server already hides it).
  useEffect(() => {
    if (!sharingUntil) return;
    const timer = setTimeout(() => setSharingUntil(null), Math.max(0, sharingUntil.getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [sharingUntil]);

  // Background updates follow the sharing state and the rider's preference.
  useEffect(() => {
    if (sharing && shareInBackground && backgroundSupported) {
      startBackgroundUpdates()
        .then((started) => {
          if (!started) setShareInBackgroundState(false);
        })
        .catch(() => {});
    } else {
      void stopBackgroundUpdates();
    }
  }, [sharing, shareInBackground, backgroundSupported]);

  const start = useCallback(async (minutes: number) => {
    const until = await startSharing(minutes);
    lastUpload.current = null;
    setSharingUntil(until);
  }, []);

  const stop = useCallback(async () => {
    await stopSharing();
    lastUpload.current = null;
    setSharingUntil(null);
    await stopBackgroundUpdates();
  }, []);

  const setShareInBackground = useCallback(async (enabled: boolean) => {
    setShareInBackgroundState(enabled);
    await AsyncStorage.setItem(BACKGROUND_PREF_KEY, String(enabled)).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      sharingUntil,
      start,
      stop,
      backgroundSupported,
      shareInBackground,
      setShareInBackground,
      permissionDenied,
    }),
    [sharingUntil, start, stop, backgroundSupported, shareInBackground, setShareInBackground, permissionDenied],
  );

  return <LocationSharingContext.Provider value={value}>{children}</LocationSharingContext.Provider>;
}

export function useLocationSharing(): LocationSharingValue {
  const context = useContext(LocationSharingContext);
  if (!context) throw new Error('useLocationSharing must be used inside <LocationSharingProvider>');
  return context;
}

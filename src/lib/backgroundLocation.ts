import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { uploadMyLocation } from './locationSharing';

// Keeps sharing while the phone is in a pocket. Requires a development or
// store build: Expo Go and web fall back to sharing only while the app is open.
export const BACKGROUND_LOCATION_TASK = 'snow-buddies-location-sharing';

type TaskData = { locations?: Location.LocationObject[] };

// Tasks must be defined at module scope, before the app renders.
if (Platform.OS !== 'web') {
  try {
    TaskManager.defineTask<TaskData>(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      if (error || !data?.locations?.length) return;
      const latest = data.locations[data.locations.length - 1];
      try {
        const stillSharing = await uploadMyLocation({
          latitude: latest.coords.latitude,
          longitude: latest.coords.longitude,
          accuracy: latest.coords.accuracy,
          heading: latest.coords.heading,
        });
        // Sharing ended (expired or stopped elsewhere): stop tracking.
        if (!stillSharing) await stopBackgroundUpdates();
      } catch {
        // Offline on the lift: the next update will retry.
      }
    });
  } catch {
    // Task manager unavailable in this runtime.
  }
}

export async function isBackgroundSharingSupported(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await TaskManager.isAvailableAsync()) && (await Location.isBackgroundLocationAvailableAsync());
  } catch {
    return false;
  }
}

/** Ask for "always" location access and start background updates. */
export async function startBackgroundUpdates(): Promise<boolean> {
  if (!(await isBackgroundSharingSupported())) return false;
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) return false;
  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) return false;
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) return true;
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 25,
    timeInterval: 20_000,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Sharing your location',
      notificationBody: 'Your chosen buddies can see you on the ski map.',
      notificationColor: '#04448C',
    },
  });
  return true;
}

export async function stopBackgroundUpdates(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch {
    // Not running.
  }
}

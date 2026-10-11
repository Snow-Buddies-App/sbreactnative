import type { FriendLocation } from '@/lib/locationSharing';
import type { LatLng, SkiMapData } from '@/lib/openskimap';

export type SkiMapProps = {
  center: LatLng;
  title: string;
  data: SkiMapData | null;
  userLocation: LatLng | null;
  friends: FriendLocation[];
  /** Called when a friend's marker callout is tapped (e.g. to open chat). */
  onFriendPress: (userId: string) => void;
};

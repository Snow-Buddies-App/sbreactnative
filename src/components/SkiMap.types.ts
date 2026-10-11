import type { FriendLocation } from '@/lib/locationSharing';
import type { LatLng, SkiMapData } from '@/lib/openskimap';
import type { PinWithOwner } from '@/lib/pins';

export type SkiMapProps = {
  center: LatLng;
  title: string;
  data: SkiMapData | null;
  userLocation: LatLng | null;
  friends: FriendLocation[];
  /** Called when a friend's marker callout is tapped (e.g. to open chat). */
  onFriendPress: (userId: string) => void;
  pins: PinWithOwner[];
  onPinPress: (pin: PinWithOwner) => void;
  /** Long-press on the map, or the "drop pin" button (my location, else map centre). */
  onDropPin: (at: LatLng) => void;
};

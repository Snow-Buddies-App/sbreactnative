import { useEffect, useState } from 'react';

import { fetchFriendLocations, isFresh, subscribeToFriendLocations } from '@/lib/locationSharing';
import type { FriendLocation } from '@/lib/locationSharing';
import { supabase } from '@/lib/supabase';

const REFRESH_MS = 30_000;

/**
 * Buddies sharing their location with me, kept live via realtime. A periodic
 * refresh also catches revoked shares and expired sessions, which realtime
 * doesn't announce to viewers.
 */
export function useFriendLocations(myId: string) {
  const [friends, setFriends] = useState<FriendLocation[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const load = () =>
      fetchFriendLocations(myId)
        .then((data) => active && setFriends(data))
        .catch(() => {});

    void load();
    const channel = subscribeToFriendLocations(() => void load());
    const timer = setInterval(() => {
      setNow(Date.now());
      void load();
    }, REFRESH_MS);

    return () => {
      active = false;
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [myId]);

  return { friends: friends.filter((f) => isFresh(f.updatedAt, now)), now };
}

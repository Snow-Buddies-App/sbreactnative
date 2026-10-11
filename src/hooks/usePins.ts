import { useCallback, useEffect, useState } from 'react';

import { fetchVisiblePins, subscribeToPins } from '@/lib/pins';
import type { PinWithOwner } from '@/lib/pins';
import { supabase } from '@/lib/supabase';

const REFRESH_MS = 60_000;

/** Pins visible to me, kept up to date (realtime + periodic refresh for expiry). */
export function usePins() {
  const [pins, setPins] = useState<PinWithOwner[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetchVisiblePins()
        .then((data) => active && setPins(data))
        .catch(() => {});
    void load();
    const channel = subscribeToPins(() => void load());
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { pins, reload };
}

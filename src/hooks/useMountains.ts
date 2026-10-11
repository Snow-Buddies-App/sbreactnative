import { useEffect, useState } from 'react';

import type { Mountain } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

let cache: Promise<Mountain[]> | null = null;

/** All mountains, fetched once per app session. */
export function fetchMountains(): Promise<Mountain[]> {
  if (!cache) {
    cache = (async () => {
      const { data, error } = await supabase.from('mountains').select('*').order('name');
      if (error) throw error;
      return data;
    })().catch((error) => {
      cache = null;
      throw error;
    });
  }
  return cache;
}

export function useMountains() {
  const [mountains, setMountains] = useState<Mountain[]>([]);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    fetchMountains()
      .then((data) => active && setMountains(data))
      .catch((e) => active && setError(e));
    return () => {
      active = false;
    };
  }, []);

  return { mountains, error };
}

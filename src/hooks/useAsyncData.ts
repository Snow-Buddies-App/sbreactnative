import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { friendlyError } from '@/lib/supabase';

type State<T> = {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
};

/**
 * Load data with an async function, reloading whenever the screen regains
 * focus or `deps` change. `refresh` re-runs it (e.g. for pull-to-refresh).
 */
export function useAsyncData<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({
    data: undefined,
    error: null,
    loading: true,
    refreshing: false,
  });
  const loadRef = useRef(load);
  loadRef.current = load;
  const requestId = useRef(0);

  const run = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    const id = ++requestId.current;
    setState((s) => ({
      ...s,
      loading: mode === 'initial' && s.data === undefined,
      refreshing: mode === 'refresh',
    }));
    try {
      const data = await loadRef.current();
      if (id === requestId.current) setState({ data, error: null, loading: false, refreshing: false });
    } catch (error) {
      if (id === requestId.current) {
        setState((s) => ({ ...s, error: friendlyError(error), loading: false, refreshing: false }));
      }
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void run('initial'), deps);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void run('silent');
    }, [run]),
  );

  const refresh = useCallback(() => run('refresh'), [run]);
  const reload = useCallback(() => run('silent'), [run]);

  return { ...state, refresh, reload };
}

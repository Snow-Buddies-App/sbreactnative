import { useEffect, useMemo, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, List, Searchbar, Surface, Text } from 'react-native-paper';

import { ResortMap } from '@/components/ResortMap';
import { EmptyView } from '@/components/StateViews';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useMountains } from '@/hooks/useMountains';
import type { LatLng, SkiAreaSearchResult } from '@/lib/openskimap';
import { searchSkiAreas } from '@/lib/openskimap';
import { useCurrentProfile } from '@/providers/AuthProvider';

type Resort = { key: string; name: string; subtitle: string; center: LatLng };

export default function MapScreen() {
  const me = useCurrentProfile();
  const { mountains } = useMountains();
  const [picked, setPicked] = useState<Resort | null>(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  // Worldwide OpenSkiMap results, tagged with the query they answer.
  const [remote, setRemote] = useState<{ query: string; results: SkiAreaSearchResult[] } | null>(null);

  // Until the rider picks a resort, show their home mountain.
  const selected = useMemo<Resort | null>(() => {
    if (picked) return picked;
    const home = mountains.find((m) => m.id === me.home_mountain_id) ?? mountains[0];
    if (!home) return null;
    return {
      key: `m-${home.id}`,
      name: home.name,
      subtitle: home.region,
      center: { latitude: home.latitude, longitude: home.longitude },
    };
  }, [picked, mountains, me.home_mountain_id]);

  const remoteQuery = debouncedQuery.length >= 3 ? debouncedQuery : null;
  useEffect(() => {
    if (!remoteQuery) return;
    const controller = new AbortController();
    searchSkiAreas(remoteQuery, controller.signal)
      .then((results) => setRemote({ query: remoteQuery, results }))
      .catch(() => !controller.signal.aborted && setRemote({ query: remoteQuery, results: [] }));
    return () => controller.abort();
  }, [remoteQuery]);

  const searching = remoteQuery !== null && remote?.query !== remoteQuery;
  const remoteResults = useMemo(
    () => (remoteQuery && remote?.query === remoteQuery ? remote.results : []),
    [remoteQuery, remote],
  );

  const results = useMemo<Resort[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const local: Resort[] = mountains
      .filter((m) => m.name.toLowerCase().includes(q) || m.region.toLowerCase().includes(q))
      .map((m) => ({
        key: `m-${m.id}`,
        name: m.name,
        subtitle: `${m.region}, ${m.country}`,
        center: { latitude: m.latitude, longitude: m.longitude },
      }));
    const localNames = new Set(local.map((r) => r.name.toLowerCase()));
    const worldwide: Resort[] = remoteResults
      .filter((r) => !localNames.has(r.name.toLowerCase()))
      .map((r) => ({ key: `o-${r.id}`, name: r.name, subtitle: r.location ?? 'OpenSkiMap', center: r.center }));
    return [...local, ...worldwide];
  }, [query, mountains, remoteResults]);

  const choose = (resort: Resort) => {
    setPicked(resort);
    setQuery('');
    Keyboard.dismiss();
  };

  return (
    <View style={styles.flex}>
      <Searchbar
        placeholder="Search any ski resort"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
        right={searching ? () => <ActivityIndicator style={styles.spinner} /> : undefined}
      />
      {query.trim() ? (
        <Surface style={styles.results} elevation={1}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {results.map((r) => (
              <List.Item
                key={r.key}
                title={r.name}
                description={r.subtitle}
                left={(p) => <List.Icon {...p} icon="image-filter-hdr" />}
                onPress={() => choose(r)}
              />
            ))}
            {results.length === 0 && !searching && (
              <Text style={styles.noResults}>
                {query.trim().length < 3 ? 'Keep typing to search worldwide…' : 'No resorts found.'}
              </Text>
            )}
          </ScrollView>
        </Surface>
      ) : selected ? (
        <ResortMap key={selected.key} name={selected.name} center={selected.center} />
      ) : (
        <EmptyView icon="map-search-outline" title="Search for a resort to see its trail map" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { margin: 12, marginBottom: 8 },
  spinner: { marginRight: 12 },
  results: { flex: 1, marginHorizontal: 12, marginBottom: 12, borderRadius: 12 },
  noResults: { padding: 16, textAlign: 'center', opacity: 0.7 },
});

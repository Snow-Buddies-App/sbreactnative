import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, FAB } from 'react-native-paper';

import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { TripCard } from '@/components/TripCard';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useMountains } from '@/hooks/useMountains';
import { fetchMyTripIds, fetchUpcomingTrips } from '@/lib/api';
import { useCurrentProfile } from '@/providers/AuthProvider';

type Filter = 'all' | 'mine' | 'home';

export default function TripsScreen() {
  const me = useCurrentProfile();
  const { mountains } = useMountains();
  const [filter, setFilter] = useState<Filter>('all');
  const homeMountain = mountains.find((m) => m.id === me.home_mountain_id);

  const { data, error, loading, refreshing, refresh } = useAsyncData(async () => {
    const [trips, myTripIds] = await Promise.all([fetchUpcomingTrips(), fetchMyTripIds(me.id)]);
    return { trips, myTripIds };
  }, [me.id]);

  const trips = useMemo(() => {
    const all = data?.trips ?? [];
    if (filter === 'mine') return all.filter((t) => data?.myTripIds.has(t.id));
    if (filter === 'home') return all.filter((t) => t.mountain_id === me.home_mountain_id);
    return all;
  }, [data, filter, me.home_mountain_id]);

  let empty;
  if (loading) empty = <LoadingView />;
  else if (error) empty = <ErrorView message={error} onRetry={refresh} />;
  else
    empty = (
      <EmptyView
        icon="calendar-blank-outline"
        title={filter === 'mine' ? "You haven't joined any trips" : 'No upcoming trips'}
        body="Plan a ride day and let other riders join you."
      />
    );

  return (
    <View style={styles.flex}>
      <FlatList
        data={loading || error ? [] : trips}
        keyExtractor={(t) => String(t.id)}
        renderItem={({ item }) => <TripCard trip={item} joined={!!data?.myTripIds.has(item.id)} />}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip selected={filter === 'all'} showSelectedOverlay onPress={() => setFilter('all')}>
              All trips
            </Chip>
            <Chip selected={filter === 'mine'} showSelectedOverlay onPress={() => setFilter('mine')}>
              My trips
            </Chip>
            {homeMountain && (
              <Chip
                icon="image-filter-hdr"
                selected={filter === 'home'}
                showSelectedOverlay
                onPress={() => setFilter('home')}
              >
                {homeMountain.name}
              </Chip>
            )}
          </ScrollView>
        }
        ListEmptyComponent={empty}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      />
      <FAB icon="plus" label="Plan a trip" style={styles.fab} onPress={() => router.push('/trip/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { flexGrow: 1, paddingBottom: 96 },
  chips: { gap: 8, padding: 16, paddingBottom: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});

import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Searchbar } from 'react-native-paper';

import { RiderCard } from '@/components/RiderCard';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useMountains } from '@/hooks/useMountains';
import { fetchBuddyRequests, fetchRiders, relationshipWith } from '@/lib/api';
import type { SkillLevel, Sport } from '@/lib/database.types';
import { SKILL_LEVELS, SPORTS } from '@/lib/labels';
import { useCurrentProfile } from '@/providers/AuthProvider';

export default function DiscoverScreen() {
  const me = useCurrentProfile();
  const { mountains } = useMountains();
  const [search, setSearch] = useState('');
  const [sameMountain, setSameMountain] = useState(!!me.home_mountain_id);
  const [sport, setSport] = useState<Sport | null>(null);
  const [skill, setSkill] = useState<SkillLevel | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const homeMountain = mountains.find((m) => m.id === me.home_mountain_id);
  const mountainId = sameMountain ? me.home_mountain_id : null;

  const { data, error, loading, refreshing, refresh } = useAsyncData(
    async () => {
      const [riders, requests] = await Promise.all([
        fetchRiders(me.id, { mountainId, sport, skill, search: debouncedSearch }),
        fetchBuddyRequests(),
      ]);
      return { riders, requests };
    },
    [me.id, mountainId, sport, skill, debouncedSearch],
  );

  const items = useMemo(
    () =>
      (data?.riders ?? []).map((rider) => ({
        rider,
        relationship: relationshipWith(me.id, rider.id, data?.requests ?? []),
      })),
    [data, me.id],
  );

  const filters = (
    <View>
      <Searchbar
        placeholder="Search riders by name"
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {homeMountain && (
          <Chip
            icon="image-filter-hdr"
            selected={sameMountain}
            showSelectedOverlay
            onPress={() => setSameMountain((v) => !v)}
          >
            {homeMountain.name}
          </Chip>
        )}
        {SPORTS.filter((s) => s.value !== 'both').map((s) => (
          <Chip
            key={s.value}
            icon={s.icon}
            selected={sport === s.value}
            showSelectedOverlay
            onPress={() => setSport(sport === s.value ? null : s.value)}
          >
            {s.label}
          </Chip>
        ))}
        {SKILL_LEVELS.map((s) => (
          <Chip
            key={s.value}
            selected={skill === s.value}
            showSelectedOverlay
            onPress={() => setSkill(skill === s.value ? null : s.value)}
          >
            {s.label}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );

  let empty;
  if (loading) empty = <LoadingView />;
  else if (error) empty = <ErrorView message={error} onRetry={refresh} />;
  else
    empty = (
      <EmptyView
        icon="account-search-outline"
        title="No riders found"
        body="Try clearing a filter or searching another name."
      />
    );

  return (
    <FlatList
      data={loading || error ? [] : items}
      keyExtractor={(item) => item.rider.id}
      renderItem={({ item }) => <RiderCard rider={item.rider} relationship={item.relationship} />}
      ListHeaderComponent={filters}
      ListEmptyComponent={empty}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 24, flexGrow: 1 },
  search: { margin: 16, marginBottom: 8 },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
});

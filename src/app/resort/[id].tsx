import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { ResortMap } from '@/components/ResortMap';
import { ErrorView, LoadingView } from '@/components/StateViews';
import { useMountains } from '@/hooks/useMountains';
import { friendlyError } from '@/lib/supabase';

export default function ResortScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mountains, error } = useMountains();
  const mountain = mountains.find((m) => m.id === Number(id));
  const center = useMemo(
    () => (mountain ? { latitude: mountain.latitude, longitude: mountain.longitude } : null),
    [mountain],
  );

  if (error) return <ErrorView message={friendlyError(error)} />;
  if (mountains.length > 0 && !mountain) return <ErrorView message="Resort not found." />;
  if (!mountain || !center) return <LoadingView />;

  return (
    <>
      <Stack.Screen options={{ title: mountain.name }} />
      <ResortMap name={mountain.name} center={center} />
    </>
  );
}

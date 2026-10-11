import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { ResortMap } from '@/components/ResortMap';
import { ErrorView, LoadingView } from '@/components/StateViews';
import { useAsyncData } from '@/hooks/useAsyncData';
import { fetchPin } from '@/lib/pins';

/** A shared pin or meetup point, opened from a chat card. */
export default function PinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pinId = Number(id);
  const { data: pin, error, loading, refresh } = useAsyncData(() => fetchPin(pinId), [pinId]);
  const center = useMemo(() => (pin ? { latitude: pin.latitude, longitude: pin.longitude } : null), [pin]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={refresh} />;
  if (!pin || !center) return <ErrorView message="This pin has expired or was removed." />;

  return (
    <>
      <Stack.Screen options={{ title: pin.title }} />
      <ResortMap name={pin.title} center={center} focusPinId={pin.id} />
    </>
  );
}

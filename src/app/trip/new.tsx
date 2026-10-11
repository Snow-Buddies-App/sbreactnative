import { yupResolver } from '@hookform/resolvers/yup';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text } from 'react-native-paper';

import { MountainPicker } from '@/components/MountainPicker';
import { FormChipSelect } from '@/components/forms/FormChipSelect';
import { FormTextInput } from '@/components/forms/FormTextInput';
import { createTrip } from '@/lib/api';
import { formatTripDate, toIsoDate, upcomingDays } from '@/lib/dates';
import { SKILL_LEVELS } from '@/lib/labels';
import { friendlyError } from '@/lib/supabase';
import { tripSchema } from '@/lib/validation';
import type { TripValues } from '@/lib/validation';
import { useCurrentProfile } from '@/providers/AuthProvider';

const DAYS = upcomingDays(60);

export default function NewTripScreen() {
  const me = useCurrentProfile();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<TripValues>({
    resolver: yupResolver(tripSchema),
    defaultValues: {
      title: '',
      mountainId: me.home_mountain_id ?? undefined,
      tripDate: toIsoDate(DAYS[1]),
      maxRiders: 6,
      minSkill: null,
      notes: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const id = await createTrip({ ...values, minSkill: values.minSkill ?? null });
      router.replace(`/trip/${id}`);
    } catch (e) {
      setError(friendlyError(e));
    }
  });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FormTextInput control={control} name="title" label="Trip name" placeholder="First chair at Vail" />
        <Controller
          control={control}
          name="mountainId"
          render={({ field, fieldState }) => (
            <MountainPicker
              label="Mountain"
              value={field.value}
              onChange={(m) => field.onChange(m?.id)}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="tripDate"
          render={({ field, fieldState }) => (
            <View>
              <Text variant="labelLarge" style={styles.label}>
                Date
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
                {DAYS.map((day) => {
                  const iso = toIsoDate(day);
                  return (
                    <Chip
                      key={iso}
                      selected={field.value === iso}
                      showSelectedOverlay
                      onPress={() => field.onChange(iso)}
                    >
                      {formatTripDate(iso)}
                    </Chip>
                  );
                })}
              </ScrollView>
              <HelperText type="error" visible={!!fieldState.error}>
                {fieldState.error?.message}
              </HelperText>
            </View>
          )}
        />
        <FormTextInput
          control={control}
          name="maxRiders"
          label="Max riders (including you)"
          keyboardType="number-pad"
          maxLength={2}
        />
        <FormChipSelect
          control={control}
          name="minSkill"
          label="Minimum level (optional)"
          options={SKILL_LEVELS.map((s) => ({ value: s.value, label: s.label }))}
          clearable
        />
        <FormTextInput
          control={control}
          name="notes"
          label="Notes (optional)"
          multiline
          numberOfLines={3}
          maxLength={500}
          placeholder="Meet at the gondola at 8:30"
        />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
        <Button mode="contained" onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting}>
          Create trip
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 6 },
  label: { marginBottom: 8 },
  days: { gap: 8 },
});

import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText } from 'react-native-paper';

import { MountainPicker } from '@/components/MountainPicker';
import { FormChipSelect } from '@/components/forms/FormChipSelect';
import { FormTextInput } from '@/components/forms/FormTextInput';
import type { Profile } from '@/lib/database.types';
import { SKILL_LEVELS, SPORTS } from '@/lib/labels';
import { friendlyError } from '@/lib/supabase';
import { profileSchema } from '@/lib/validation';
import type { ProfileValues } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';

type Props = {
  profile: Profile;
  submitLabel: string;
  onSaved?: () => void;
};

/** Edit the rider's profile; saving also marks onboarding as complete. */
export function ProfileForm({ profile, submitLabel, onSaved }: Props) {
  const { updateProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileValues>({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      displayName: profile.display_name,
      sport: profile.sport ?? undefined,
      skillLevel: profile.skill_level ?? undefined,
      homeMountainId: profile.home_mountain_id,
      bio: profile.bio ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await updateProfile({
        display_name: values.displayName,
        sport: values.sport,
        skill_level: values.skillLevel,
        home_mountain_id: values.homeMountainId ?? null,
        bio: values.bio || null,
        onboarded: true,
      });
      onSaved?.();
    } catch (e) {
      setError(friendlyError(e));
    }
  });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FormTextInput control={control} name="displayName" label="Display name" />
        <FormChipSelect
          control={control}
          name="sport"
          label="I ride"
          options={SPORTS.map((s) => ({ value: s.value, label: s.label, icon: s.icon }))}
        />
        <FormChipSelect
          control={control}
          name="skillLevel"
          label="My level"
          options={SKILL_LEVELS.map((s) => ({ value: s.value, label: s.label }))}
        />
        <Controller
          control={control}
          name="homeMountainId"
          render={({ field, fieldState }) => (
            <MountainPicker
              label="Home mountain"
              value={field.value}
              onChange={(m) => field.onChange(m?.id ?? null)}
              error={fieldState.error?.message}
              allowClear
            />
          )}
        />
        <FormTextInput
          control={control}
          name="bio"
          label="About you (optional)"
          multiline
          numberOfLines={3}
          maxLength={280}
          hint="Favourite runs, pace, whether you're a first-chair person…"
        />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
        <Button mode="contained" onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 6 },
});

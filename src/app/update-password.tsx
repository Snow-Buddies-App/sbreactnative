import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import * as yup from 'yup';

import { FormTextInput } from '@/components/forms/FormTextInput';
import { friendlyError, supabase } from '@/lib/supabase';
import { registerSchema } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';

const schema = registerSchema.pick(['password', 'confirmPassword']);
type Values = yup.InferType<typeof schema>;

export default function UpdatePasswordScreen() {
  const { finishPasswordRecovery } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Values>({
    resolver: yupResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError(friendlyError(updateError));
    else finishPasswordRecovery();
  });

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="bodyLarge" style={styles.intro}>
        Choose a new password for your account.
      </Text>
      <FormTextInput
        control={control}
        name="password"
        label="New password"
        password
        autoComplete="new-password"
        hint="8+ characters with a letter and a number"
      />
      <FormTextInput
        control={control}
        name="confirmPassword"
        label="Confirm new password"
        password
        autoComplete="new-password"
        onSubmitEditing={onSubmit}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
      <Button mode="contained" onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting}>
        Save password
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 4 },
  intro: { marginBottom: 16 },
});

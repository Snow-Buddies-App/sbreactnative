import { yupResolver } from '@hookform/resolvers/yup';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';

import { FormTextInput } from '@/components/forms/FormTextInput';
import { friendlyError, supabase } from '@/lib/supabase';
import { forgotPasswordSchema } from '@/lib/validation';
import type { ForgotPasswordValues } from '@/lib/validation';

export default function ForgotPasswordScreen() {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL('/login', { queryParams: { type: 'recovery' } }),
    });
    if (resetError) setError(friendlyError(resetError));
    else setSentTo(email);
  });

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="bodyLarge" style={styles.intro}>
        Enter your account email and we&apos;ll send you a link to reset your password.
      </Text>
      <FormTextInput
        control={control}
        name="email"
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        onSubmitEditing={onSubmit}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
      {sentTo ? (
        <Text variant="bodyMedium">If an account exists for {sentTo}, a reset link is on its way.</Text>
      ) : (
        <Button mode="contained" onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting}>
          Send reset link
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 4 },
  intro: { marginBottom: 16 },
});

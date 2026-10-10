import { yupResolver } from '@hookform/resolvers/yup';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';

import { EmptyView } from '@/components/StateViews';
import { SocialSignIn } from '@/components/SocialSignIn';
import { FormTextInput } from '@/components/forms/FormTextInput';
import { friendlyError, supabase } from '@/lib/supabase';
import { registerSchema } from '@/lib/validation';
import type { RegisterValues } from '@/lib/validation';

export default function RegisterScreen() {
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterValues>({
    resolver: yupResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ displayName, email, password }) => {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      // Read by the handle_new_user trigger to create the profile.
      options: { data: { display_name: displayName } },
    });
    if (signUpError) {
      setError(friendlyError(signUpError));
    } else if (!data.session) {
      // Email confirmation is enabled for the project.
      setConfirmEmail(email);
    }
  });

  if (confirmEmail) {
    return (
      <EmptyView
        icon="email-check-outline"
        title="Check your email"
        body={`We sent a confirmation link to ${confirmEmail}. Open it, then log in.`}
        action={
          <Link href="/login" replace asChild>
            <Button mode="contained">Go to log in</Button>
          </Link>
        }
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={styles.title}>
          Join Snow Buddies
        </Text>
        <SocialSignIn />
        <FormTextInput control={control} name="displayName" label="Display name" autoComplete="name" />
        <FormTextInput
          control={control}
          name="email"
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <FormTextInput
          control={control}
          name="password"
          label="Password"
          password
          autoComplete="new-password"
          textContentType="newPassword"
          hint="8+ characters with a letter and a number"
        />
        <FormTextInput
          control={control}
          name="confirmPassword"
          label="Confirm password"
          password
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={onSubmit}
        />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
        <Button mode="contained" onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting}>
          Create account
        </Button>
        <Link href="/login" replace asChild>
          <Button style={styles.link}>Already have an account? Log in</Button>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 4 },
  title: { marginBottom: 16 },
  link: { marginTop: 12 },
});

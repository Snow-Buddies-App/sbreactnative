import { yupResolver } from '@hookform/resolvers/yup';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';

import { SocialSignIn } from '@/components/SocialSignIn';
import { FormTextInput } from '@/components/forms/FormTextInput';
import { friendlyError, supabase } from '@/lib/supabase';
import { loginSchema } from '@/lib/validation';
import type { LoginValues } from '@/lib/validation';

export default function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    // On success the auth guard in the root layout moves us into the app.
    if (signInError) setError(friendlyError(signInError));
  });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={styles.title}>
          Welcome back
        </Text>
        <SocialSignIn />
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
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={onSubmit}
        />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
        <Button mode="contained" onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting}>
          Log in
        </Button>
        <View style={styles.links}>
          <Link href="/forgot-password" asChild>
            <Button compact>Forgot password?</Button>
          </Link>
          <Link href="/register" replace asChild>
            <Button compact>Create an account</Button>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 4 },
  title: { marginBottom: 16 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
});

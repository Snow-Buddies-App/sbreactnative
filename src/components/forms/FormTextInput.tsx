import { useState } from 'react';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';
import { useController } from 'react-hook-form';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

type Props<T extends FieldValues> = Omit<
  ComponentProps<typeof TextInput>,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> & {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  /** Show/hide toggle for password fields. */
  password?: boolean;
  hint?: string;
};

/** A Paper text input bound to react-hook-form, showing its validation error. */
export function FormTextInput<T extends FieldValues>({
  control,
  name,
  label,
  password,
  hint,
  ...inputProps
}: Props<T>) {
  const { field, fieldState } = useController({ control, name });
  const [hidden, setHidden] = useState(true);
  const message = fieldState.error?.message ?? hint;

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label={label}
        value={field.value == null ? '' : String(field.value)}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        error={!!fieldState.error}
        secureTextEntry={password ? hidden : inputProps.secureTextEntry}
        right={
          password ? (
            <TextInput.Icon
              icon={hidden ? 'eye' : 'eye-off'}
              onPress={() => setHidden((h) => !h)}
              accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            />
          ) : (
            inputProps.right
          )
        }
        {...(password ? { autoCapitalize: 'none', autoCorrect: false } : null)}
        {...inputProps}
      />
      <HelperText type={fieldState.error ? 'error' : 'info'} visible={!!message}>
        {message}
      </HelperText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 2 },
});

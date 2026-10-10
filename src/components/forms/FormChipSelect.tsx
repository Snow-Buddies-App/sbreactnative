import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text } from 'react-native-paper';
import { useController } from 'react-hook-form';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

export type ChipOption<V extends string> = { value: V; label: string; icon?: string };

type Props<T extends FieldValues, V extends string> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: ChipOption<V>[];
  /** Allow tapping the selected chip again to clear it. */
  clearable?: boolean;
};

/** Single-choice chip group bound to react-hook-form. */
export function FormChipSelect<T extends FieldValues, V extends string>({
  control,
  name,
  label,
  options,
  clearable,
}: Props<T, V>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <View style={styles.container}>
      <Text variant="labelLarge" style={styles.label}>
        {label}
      </Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = field.value === option.value;
          return (
            <Chip
              key={option.value}
              icon={option.icon}
              selected={selected}
              showSelectedOverlay
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => field.onChange(selected && clearable ? null : option.value)}
            >
              {option.label}
            </Chip>
          );
        })}
      </View>
      <HelperText type="error" visible={!!fieldState.error}>
        {fieldState.error?.message}
      </HelperText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 2 },
  label: { marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

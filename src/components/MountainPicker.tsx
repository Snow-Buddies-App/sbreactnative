import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, HelperText, List, Portal, Searchbar, Text } from 'react-native-paper';

import { useMountains } from '@/hooks/useMountains';
import type { Mountain } from '@/lib/database.types';

type Props = {
  label: string;
  value: number | null | undefined;
  onChange: (mountain: Mountain | null) => void;
  error?: string;
  allowClear?: boolean;
};

/** A field that opens a searchable list of mountains. */
export function MountainPicker({ label, value, onChange, error, allowClear }: Props) {
  const { mountains } = useMountains();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = mountains.find((m) => m.id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mountains;
    return mountains.filter(
      (m) => m.name.toLowerCase().includes(q) || m.region.toLowerCase().includes(q),
    );
  }, [mountains, query]);

  const choose = (mountain: Mountain | null) => {
    onChange(mountain);
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.container}>
      <Text variant="labelLarge" style={styles.label}>
        {label}
      </Text>
      <Button
        mode="outlined"
        icon="image-filter-hdr"
        contentStyle={styles.buttonContent}
        onPress={() => setOpen(true)}
      >
        {selected ? `${selected.name} · ${selected.region}` : 'Choose a mountain'}
      </Button>
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      <Portal>
        <Dialog visible={open} onDismiss={() => setOpen(false)} style={styles.dialog}>
          <Dialog.Title>{label}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Searchbar
              placeholder="Search mountains or regions"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            <FlatList
              data={filtered}
              keyExtractor={(m) => String(m.id)}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => (
                <List.Item
                  title={item.name}
                  description={`${item.region}, ${item.country}`}
                  left={(props) => <List.Icon {...props} icon="image-filter-hdr" />}
                  right={(props) =>
                    item.id === value ? <List.Icon {...props} icon="check" /> : null
                  }
                  onPress={() => choose(item)}
                />
              )}
              ListEmptyComponent={<Text style={styles.empty}>No mountains match “{query}”.</Text>}
            />
          </Dialog.Content>
          <Dialog.Actions>
            {allowClear && value != null && <Button onPress={() => choose(null)}>Clear</Button>}
            <Button onPress={() => setOpen(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 2 },
  label: { marginBottom: 8 },
  buttonContent: { justifyContent: 'flex-start' },
  dialog: { maxHeight: '85%' },
  dialogContent: { gap: 8 },
  list: { maxHeight: 380 },
  empty: { padding: 16, textAlign: 'center' },
});

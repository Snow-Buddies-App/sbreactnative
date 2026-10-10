import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Icon, Text } from 'react-native-paper';

export function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Icon source="alert-circle-outline" size={40} />
      <Text variant="bodyLarge" style={styles.text}>
        {message}
      </Text>
      {onRetry && (
        <Button mode="contained-tonal" onPress={onRetry}>
          Try again
        </Button>
      )}
    </View>
  );
}

export function EmptyView({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <Icon source={icon} size={48} />
      <Text variant="titleMedium" style={styles.text}>
        {title}
      </Text>
      {body && (
        <Text variant="bodyMedium" style={[styles.text, styles.muted]}>
          {body}
        </Text>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  text: { textAlign: 'center' },
  muted: { opacity: 0.7 },
});

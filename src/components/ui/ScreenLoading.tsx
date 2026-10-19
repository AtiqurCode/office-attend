import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { APP_NAME } from '@/constants/config';
import { useAppTheme } from '@/hooks/useAppTheme';

import { SkeletonList } from './Skeleton';

type Props = {
  /** Short status under the spinner */
  message?: string;
  /** Show list placeholders instead of a centered spinner */
  variant?: 'spinner' | 'list';
  listCount?: number;
};

export function ScreenLoading({
  message = 'Loading…',
  variant = 'spinner',
  listCount = 6,
}: Props) {
  const theme = useAppTheme();

  if (variant === 'list') {
    return (
      <View style={[styles.listWrap, { backgroundColor: theme.background }]}>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>{message}</Text>
        <SkeletonList count={listCount} />
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.brand} />
      <Text style={[styles.brand, { color: theme.brand }]}>{APP_NAME}</Text>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  listWrap: { flex: 1, padding: 16, gap: 12 },
  brand: { fontSize: 15, fontWeight: '800', letterSpacing: 0.4, marginTop: 4 },
  hint: { fontSize: 14, textAlign: 'center' },
});

import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/useAppTheme';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = '100%', height = 14, radius = 8, style }: SkeletonProps) {
  const theme = useAppTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [pulse]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.38, 0.85]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.surfaceMuted,
        },
        animStyle,
        style,
      ]}
    />
  );
}

export function SkeletonRowCard({ lines = 2 }: { lines?: number }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Skeleton width={44} height={44} radius={22} />
      <View style={styles.cardBody}>
        <Skeleton width="55%" height={16} />
        {Array.from({ length: Math.max(1, lines - 1) }).map((_, i) => (
          <Skeleton key={i} width={i === 0 ? '40%' : '70%'} height={12} />
        ))}
      </View>
      <Skeleton width={56} height={24} radius={12} />
    </View>
  );
}

export function SkeletonList({ count = 6, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRowCard key={i} lines={lines} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardBody: { flex: 1, gap: 8 },
  list: { gap: 10 },
});

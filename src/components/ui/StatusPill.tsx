import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const theme = useAppTheme();
  const bg =
    tone === 'success'
      ? theme.brandSoft
      : tone === 'warning'
        ? theme.accentSoft ?? '#F8E6DC'
        : tone === 'danger'
          ? theme.dangerSoft
          : tone === 'info'
            ? theme.infoSoft
            : theme.surfaceMuted;
  const color =
    tone === 'success'
      ? theme.brand
      : tone === 'warning'
        ? theme.warning
        : tone === 'danger'
          ? theme.danger
          : tone === 'info'
            ? theme.info
            : theme.textSecondary;

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});


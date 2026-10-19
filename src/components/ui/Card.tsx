import { StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

export function Card({ style, ...rest }: ViewProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
});


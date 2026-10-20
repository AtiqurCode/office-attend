import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';

type Props = {
  children: ReactNode;
  /** Soft brand band behind the top of the screen */
  brandBand?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: { top?: boolean; bottom?: boolean };
};

/**
 * Shared screen chrome — warm paper ground + optional brand band for identity.
 */
export function Screen({
  children,
  brandBand = false,
  style,
  contentStyle,
  edges = { top: true, bottom: true },
}: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }, style]}>
      {brandBand ? (
        <View
          pointerEvents="none"
          style={[
            styles.band,
            {
              backgroundColor: theme.brand,
              height: insets.top + 120,
            },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.content,
          {
            paddingTop: edges.top ? insets.top + (brandBand ? 8 : 0) : 0,
            paddingBottom: edges.bottom ? Math.max(insets.bottom, 12) : 0,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0.12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  content: { flex: 1 },
});

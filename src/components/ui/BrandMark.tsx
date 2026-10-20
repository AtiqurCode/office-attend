import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { APP_NAME } from '@/constants/config';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** App mark — brand green tile + splash glyph. */
export function BrandMark({ size = 88, style }: Props) {
  const theme = useAppTheme();
  const radius = Math.round(size * 0.26);

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: theme.brand,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${APP_NAME} logo`}
    >
      <Image
        source={require('../../../assets/images/splash-icon.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});

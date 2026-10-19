import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  style,
  ...rest
}: Props) {
  const theme = useAppTheme();
  const bg =
    variant === 'primary'
      ? theme.brand
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? theme.surface
          : 'transparent';
  const border =
    variant === 'primary' || variant === 'danger'
      ? bg
      : variant === 'secondary'
        ? theme.border
        : 'transparent';
  const color =
    variant === 'primary' || variant === 'danger' ? '#fff' : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled || loading ? 0.5 : pressed ? 0.9 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.label, { color }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});


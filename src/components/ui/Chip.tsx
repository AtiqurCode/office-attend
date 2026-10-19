import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

export function Chip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.brand : theme.surface,
          borderColor: selected ? theme.brand : theme.border,
        },
        style,
      ]}
    >
      <Text
        style={{ color: selected ? '#fff' : theme.text, fontWeight: '600', fontSize: 14 }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

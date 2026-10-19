import { useColorScheme } from 'react-native';

import { DarkTheme, LightTheme } from '@/theme/colors';

export function useAppTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DarkTheme : LightTheme;
}

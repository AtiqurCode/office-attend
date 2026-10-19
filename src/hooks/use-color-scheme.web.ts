import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Web hydration helper kept minimal for Expo template compatibility.
 */
export function useColorScheme() {
  return useRNColorScheme() ?? 'light';
}

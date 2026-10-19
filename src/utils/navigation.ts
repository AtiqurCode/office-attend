import type { Href } from 'expo-router';

/** Typed-routes helper while Expo regenerates route unions after structural changes. */
export function href(path: string): Href {
  return path as Href;
}

/** Expo search params are sometimes `string | string[]`. */
export function paramString(
  value: string | string[] | undefined | null,
  fallback = ''
): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  if (typeof value === 'string') return value;
  return fallback;
}

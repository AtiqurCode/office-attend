import NetInfo from '@react-native-community/netinfo';

export class OfflineError extends Error {
  constructor(message = 'Internet required. Connect to Wi‑Fi or mobile data and try again.') {
    super(message);
    this.name = 'OfflineError';
  }
}

/**
 * Only treat as offline when NetInfo is *sure* we have no link.
 * `isInternetReachable` is often `false`/`null` on Android Wi‑Fi even when online —
 * so we do not use it as a hard block. Real Firebase calls are the source of truth.
 */
export async function assertOnline(): Promise<void> {
  const state = await NetInfo.fetch();
  // Definite disconnect only.
  if (state.isConnected === false) {
    throw new OfflineError();
  }
}

export async function isOnline(): Promise<boolean> {
  try {
    await assertOnline();
    return true;
  } catch {
    return false;
  }
}

/** True when the error looks like a network / offline failure from Firebase or NetInfo. */
export function isConnectivityError(error: unknown): boolean {
  if (error instanceof OfflineError) return true;
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  const code = 'code' in error ? String((error as { code?: string }).code) : '';
  return (
    code.includes('unavailable') ||
    code.includes('network') ||
    msg.includes('network') ||
    msg.includes('offline') ||
    msg.includes('internet') ||
    msg.includes('failed to fetch') ||
    (msg.includes('firestore') && msg.includes('unreachable'))
  );
}

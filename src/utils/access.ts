import type { AppSettings } from '@/features/settings/repositories/SettingsRepository';
import type { AuthProfile } from '@/firebase/authAccount';

/**
 * Signed-in accounts skip the device admin PIN.
 * Local SQLite (no account) still uses adminModeEnabled.
 */
export function canManage(
  authUser: AuthProfile | null | undefined,
  settings: Pick<AppSettings, 'adminModeEnabled'> | null | undefined
): boolean {
  if (authUser) return true;
  return Boolean(settings?.adminModeEnabled);
}

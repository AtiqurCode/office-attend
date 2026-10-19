import type { SQLiteDatabase } from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';

import { DEFAULT_SETTINGS } from '@/constants/config';
import { nowUtcIso } from '@/utils/datetime';

export interface AppSettings {
  gpsAccuracyThresholdMeters: number;
  requireBiometricGate: boolean;
  retainAttendanceSelfies: boolean;
  retainReferenceSelfie: boolean;
  adminModeEnabled: boolean;
  selectedOfficeId: string | null;
  onboardingCompleted: boolean;
  privacyConsentAt: string | null;
}

const SECURE_ADMIN_PIN_KEY = 'admin_mode_pin_hash';

export class SettingsRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getSettings(): Promise<AppSettings> {
    const rows = await this.db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_settings'
    );
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    return {
      gpsAccuracyThresholdMeters: Number(
        map.gpsAccuracyThresholdMeters ?? DEFAULT_SETTINGS.gpsAccuracyThresholdMeters
      ),
      requireBiometricGate: map.requireBiometricGate === 'true',
      retainAttendanceSelfies: map.retainAttendanceSelfies === 'true',
      retainReferenceSelfie:
        map.retainReferenceSelfie == null
          ? DEFAULT_SETTINGS.retainReferenceSelfie
          : map.retainReferenceSelfie === 'true',
      adminModeEnabled: map.adminModeEnabled === 'true',
      selectedOfficeId: map.selectedOfficeId ?? null,
      onboardingCompleted: map.onboardingCompleted === 'true',
      privacyConsentAt: map.privacyConsentAt ?? null,
    };
  }

  async set(key: keyof AppSettings, value: string | number | boolean | null): Promise<void> {
    const serialized =
      value === null || value === undefined ? '' : typeof value === 'boolean' ? String(value) : String(value);
    await this.db.runAsync(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      key,
      serialized,
      nowUtcIso()
    );
  }

  async updateMany(partial: Partial<AppSettings>): Promise<AppSettings> {
    for (const [key, value] of Object.entries(partial)) {
      await this.set(key as keyof AppSettings, value as string | number | boolean | null);
    }
    return this.getSettings();
  }

  async setAdminPin(pin: string): Promise<void> {
    // Lightweight local gate only — not secure against a device owner.
    const hash = simpleHash(pin);
    await SecureStore.setItemAsync(SECURE_ADMIN_PIN_KEY, hash);
  }

  async verifyAdminPin(pin: string): Promise<boolean> {
    const stored = await SecureStore.getItemAsync(SECURE_ADMIN_PIN_KEY);
    if (!stored) {
      // First-time: accept and store
      await this.setAdminPin(pin);
      return true;
    }
    return stored === simpleHash(pin);
  }

  async clearAll(): Promise<void> {
    await this.db.runAsync('DELETE FROM app_settings');
    try {
      await SecureStore.deleteItemAsync(SECURE_ADMIN_PIN_KEY);
    } catch {
      // ignore
    }
  }
}

function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return `h${h}`;
}

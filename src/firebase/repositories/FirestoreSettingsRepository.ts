import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { DEFAULT_SETTINGS } from '@/constants/config';
import type { AppSettings } from '@/features/settings/repositories/SettingsRepository';
import { assertOnline } from '@/firebase/online';

const SETTINGS_KEY = 'attendface.deviceSettings';
const SECURE_ADMIN_PIN_KEY = 'admin_mode_pin_hash';

const defaults: AppSettings = {
  gpsAccuracyThresholdMeters: DEFAULT_SETTINGS.gpsAccuracyThresholdMeters,
  requireBiometricGate: DEFAULT_SETTINGS.requireBiometricGate,
  retainAttendanceSelfies: DEFAULT_SETTINGS.retainAttendanceSelfies,
  retainReferenceSelfie: DEFAULT_SETTINGS.retainReferenceSelfie,
  adminModeEnabled: DEFAULT_SETTINGS.adminModeEnabled,
  selectedOfficeId: null,
  onboardingCompleted: false,
  privacyConsentAt: null,
};

/**
 * Device-local settings (AsyncStorage). Still requires network for app operations;
 * settings themselves are readable offline so bootstrap can show a clear offline gate.
 */
export class FirestoreSettingsRepository {
  async getSettings(): Promise<AppSettings> {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaults };
    try {
      return { ...defaults, ...(JSON.parse(raw) as Partial<AppSettings>) };
    } catch {
      return { ...defaults };
    }
  }

  async set(key: keyof AppSettings, value: string | number | boolean | null): Promise<void> {
    const current = await this.getSettings();
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...current, [key]: value })
    );
  }

  async updateMany(partial: Partial<AppSettings>): Promise<AppSettings> {
    // Mutating settings that affect cloud ops should be online.
    if (
      partial.onboardingCompleted === true ||
      partial.selectedOfficeId !== undefined
    ) {
      await assertOnline();
    }
    const current = await this.getSettings();
    const next = { ...current, ...partial };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  }

  async setAdminPin(pin: string): Promise<void> {
    await SecureStore.setItemAsync(SECURE_ADMIN_PIN_KEY, simpleHash(pin));
  }

  async verifyAdminPin(pin: string): Promise<boolean> {
    const stored = await SecureStore.getItemAsync(SECURE_ADMIN_PIN_KEY);
    if (!stored) {
      await this.setAdminPin(pin);
      return true;
    }
    return stored === simpleHash(pin);
  }

  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(SETTINGS_KEY);
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

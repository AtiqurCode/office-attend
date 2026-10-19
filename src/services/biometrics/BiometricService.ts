import * as LocalAuthentication from 'expo-local-authentication';

import {
  BiometricGateStatuses,
  type BiometricGateStatus,
} from '@/constants/status';

export interface BiometricService {
  isHardwareAvailable(): Promise<boolean>;
  authenticate(reason: string): Promise<BiometricGateStatus>;
}

export class ExpoBiometricService implements BiometricService {
  async isHardwareAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && enrolled;
  }

  async authenticate(reason: string): Promise<BiometricGateStatus> {
    const available = await this.isHardwareAvailable();
    if (!available) return BiometricGateStatuses.UNAVAILABLE;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) return BiometricGateStatuses.SUCCESS;
    if (result.error === 'user_cancel' || result.error === 'system_cancel') {
      return BiometricGateStatuses.CANCELLED;
    }
    return BiometricGateStatuses.FAILED;
  }
}

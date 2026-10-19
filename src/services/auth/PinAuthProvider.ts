import { EMPLOYEE_PIN_LENGTH, isValidEmployeePin } from '@/constants/pin';
import { verifyEmployeePin } from '@/utils/pinHash';

export interface PinAuthResult {
  ok: boolean;
  message: string;
}

export interface PinAuthProvider {
  verify(employeeId: string, pin: string, pinHash: string | null): Promise<PinAuthResult>;
}

export class HashPinAuthProvider implements PinAuthProvider {
  async verify(
    employeeId: string,
    pin: string,
    pinHash: string | null
  ): Promise<PinAuthResult> {
    if (!pinHash) {
      return { ok: false, message: 'No PIN enrolled for this employee. Ask an admin to set one.' };
    }
    if (!isValidEmployeePin(pin)) {
      return { ok: false, message: `PIN must be ${EMPLOYEE_PIN_LENGTH} digits.` };
    }
    const ok = await verifyEmployeePin(employeeId, pin, pinHash);
    return ok
      ? { ok: true, message: 'PIN verified.' }
      : { ok: false, message: 'Incorrect PIN.' };
  }
}

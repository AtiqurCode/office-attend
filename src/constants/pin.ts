/** Employee punch PIN — fixed length for now (auto-submits on kiosk). */
export const EMPLOYEE_PIN_LENGTH = 4;

export const EMPLOYEE_PIN_REGEX = new RegExp(`^\\d{${EMPLOYEE_PIN_LENGTH}}$`);

export function isValidEmployeePin(pin: string): boolean {
  return EMPLOYEE_PIN_REGEX.test(pin.trim());
}

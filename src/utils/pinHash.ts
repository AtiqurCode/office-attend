import * as Crypto from 'expo-crypto';

export async function hashEmployeePin(employeeId: string, pin: string): Promise<string> {
  const payload = `${employeeId}:${pin.trim()}`;
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
}

export async function verifyEmployeePin(
  employeeId: string,
  pin: string,
  pinHash: string | null
): Promise<boolean> {
  if (!pinHash) return false;
  const computed = await hashEmployeePin(employeeId, pin);
  return computed === pinHash;
}

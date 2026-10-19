import { HashPinAuthProvider } from '@/services/auth/PinAuthProvider';
import { hashEmployeePin } from '@/utils/pinHash';

describe('HashPinAuthProvider', () => {
  const provider = new HashPinAuthProvider();

  it('accepts a correct PIN', async () => {
    const employeeId = 'emp-1';
    const pinHash = await hashEmployeePin(employeeId, '1234');
    const result = await provider.verify(employeeId, '1234', pinHash);
    expect(result.ok).toBe(true);
  });

  it('rejects a wrong PIN', async () => {
    const employeeId = 'emp-1';
    const pinHash = await hashEmployeePin(employeeId, '1234');
    const result = await provider.verify(employeeId, '9999', pinHash);
    expect(result.ok).toBe(false);
  });

  it('rejects when no PIN enrolled', async () => {
    const result = await provider.verify('emp-1', '1234', null);
    expect(result.ok).toBe(false);
  });

  it('rejects non-4-digit PIN', async () => {
    const employeeId = 'emp-1';
    const pinHash = await hashEmployeePin(employeeId, '1234');
    const result = await provider.verify(employeeId, '12345', pinHash);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/4 digits/);
  });
});

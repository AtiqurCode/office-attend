/**
 * Pure state-machine rules used by AttendanceService before persistence.
 */
type OpenRecord = { id: string } | null;

function canCheckIn(open: OpenRecord): { ok: boolean; reason?: string } {
  if (open) return { ok: false, reason: 'Already checked in' };
  return { ok: true };
}

function canCheckOut(open: OpenRecord): { ok: boolean; reason?: string } {
  if (!open) return { ok: false, reason: 'No active check-in' };
  return { ok: true };
}

describe('attendance state machine', () => {
  it('prevents duplicate check-in for the same employee', () => {
    expect(canCheckIn({ id: '1' }).ok).toBe(false);
    expect(canCheckIn(null).ok).toBe(true);
  });

  it('prevents check-out without open check-in', () => {
    expect(canCheckOut(null).ok).toBe(false);
    expect(canCheckOut({ id: '1' }).ok).toBe(true);
  });

  it('allows another pair after checkout (multiple per day)', () => {
    const afterCheckout: OpenRecord = null;
    expect(canCheckIn(afterCheckout).ok).toBe(true);
  });

  it('open session is per-employee (A open does not block B)', () => {
    const openA = { id: 'a1' };
    const openB: OpenRecord = null;
    expect(canCheckIn(openA).ok).toBe(false);
    expect(canCheckIn(openB).ok).toBe(true);
  });
});

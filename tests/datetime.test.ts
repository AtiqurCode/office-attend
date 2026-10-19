import {
  formatLocalDateTime,
  localDayBoundsUtc,
  localMonthBoundsUtc,
  nowUtcIso,
} from '@/utils/datetime';

describe('datetime utils', () => {
  it('returns ISO UTC for now', () => {
    expect(nowUtcIso()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('formats invalid as dash', () => {
    expect(formatLocalDateTime(null)).toBe('—');
    expect(formatLocalDateTime('not-a-date')).toBe('—');
  });

  it('builds local day bounds', () => {
    const ref = new Date(2026, 0, 15, 12, 0, 0);
    const { startUtc, endUtc } = localDayBoundsUtc(ref);
    expect(new Date(startUtc).getTime()).toBeLessThan(new Date(endUtc).getTime());
    expect(startUtc).toContain('2026');
  });

  it('builds month bounds covering the month', () => {
    const { startUtc, endUtc } = localMonthBoundsUtc(2026, 1);
    expect(new Date(startUtc).getMonth()).toBe(1);
    expect(new Date(endUtc).getMonth()).toBe(1);
  });
});

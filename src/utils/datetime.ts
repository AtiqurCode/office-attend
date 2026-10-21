export function nowUtcIso(): string {
  return new Date().toISOString();
}

export function formatLocalDateTime(isoUtc: string | null | undefined): string {
  if (!isoUtc) return '—';
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatLocalTime(isoUtc: string | null | undefined): string {
  if (!isoUtc) return '—';
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
  }).format(date);
}

export function formatLocalDate(isoUtc: string | null | undefined): string {
  if (!isoUtc) return '—';
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(date);
}

/** Local calendar day bounds as UTC ISO strings for SQL filtering. */
export function localDayBoundsUtc(reference = new Date()): {
  startUtc: string;
  endUtc: string;
} {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(reference);
  end.setHours(23, 59, 59, 999);
  return { startUtc: start.toISOString(), endUtc: end.toISOString() };
}

export function localMonthBoundsUtc(year: number, monthIndex: number): {
  startUtc: string;
  endUtc: string;
} {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { startUtc: start.toISOString(), endUtc: end.toISOString() };
}

export function todayLabel(reference = new Date()): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(reference);
}

export type ReportPeriod = 'day' | 'week' | 'biweek' | 'month' | 'year';

/** Local period bounds as UTC ISO strings for SQL filtering. */
export function localPeriodBoundsUtc(
  period: ReportPeriod,
  reference = new Date()
): { startUtc: string; endUtc: string; label: string } {
  const ref = new Date(reference);

  if (period === 'day') {
    const { startUtc, endUtc } = localDayBoundsUtc(ref);
    return {
      startUtc,
      endUtc,
      label: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(ref),
    };
  }

  if (period === 'week' || period === 'biweek') {
    const start = new Date(ref);
    const day = start.getDay(); // 0 Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + (period === 'week' ? 6 : 13));
    end.setHours(23, 59, 59, 999);
    const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
    return {
      startUtc: start.toISOString(),
      endUtc: end.toISOString(),
      label: `${fmt.format(start)} – ${fmt.format(end)}`,
    };
  }

  if (period === 'month') {
    const { startUtc, endUtc } = localMonthBoundsUtc(ref.getFullYear(), ref.getMonth());
    return {
      startUtc,
      endUtc,
      label: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(ref),
    };
  }

  // year
  const start = new Date(ref.getFullYear(), 0, 1, 0, 0, 0, 0);
  const end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
  return {
    startUtc: start.toISOString(),
    endUtc: end.toISOString(),
    label: String(ref.getFullYear()),
  };
}

export function shiftPeriodAnchor(period: ReportPeriod, reference: Date, delta: number): Date {
  const next = new Date(reference);
  if (period === 'day') next.setDate(next.getDate() + delta);
  else if (period === 'week') next.setDate(next.getDate() + delta * 7);
  else if (period === 'biweek') next.setDate(next.getDate() + delta * 14);
  else if (period === 'month') next.setMonth(next.getMonth() + delta);
  else next.setFullYear(next.getFullYear() + delta);
  return next;
}

/** Parse local `YYYY-MM-DD` + `HH:mm` into UTC ISO. */
export function localDateTimeToUtcIso(dateStr: string, timeStr: string): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  const tm = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!dm || !tm) return null;
  const y = Number(dm[1]);
  const mo = Number(dm[2]) - 1;
  const d = Number(dm[3]);
  const h = Number(tm[1]);
  const mi = Number(tm[2]);
  if (mo < 0 || mo > 11 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const local = new Date(y, mo, d, h, mi, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function localDateInputValue(reference = new Date()): string {
  return `${reference.getFullYear()}-${pad2(reference.getMonth() + 1)}-${pad2(reference.getDate())}`;
}

export function localTimeInputValue(reference = new Date()): string {
  return `${pad2(reference.getHours())}:${pad2(reference.getMinutes())}`;
}

/** Hours between two punches. `Still in` when checkout has not happened. */
export function formatPunchLength(
  checkInAt: string | null | undefined,
  checkOutAt: string | null | undefined
): string {
  if (!checkInAt) return '—';
  if (!checkOutAt) return 'Still in';
  const ms = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

import type { AttendanceWithOffice } from '@/features/attendance/types';
import { formatLocalDateTime } from '@/utils/datetime';

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildAttendanceCsv(
  companyName: string,
  periodLabel: string,
  records: AttendanceWithOffice[]
): string {
  const header = [
    'Employee',
    'Code',
    'Location',
    'Check in',
    'Check out',
    'In GPS',
    'Out GPS',
    'Method',
    'Status',
    'Note',
  ].join(',');

  const lines = records.map((r) =>
    [
      r.employeeName ?? '',
      r.employeeCode ?? '',
      r.officeName ?? '',
      formatLocalDateTime(r.checkInAt),
      formatLocalDateTime(r.checkOutAt),
      r.checkInLocationLabel ?? '',
      r.checkOutLocationLabel ?? '',
      r.identityMethod ?? '',
      r.attendanceStatus,
      r.locationValidationMessage ?? r.rejectionReason ?? '',
    ]
      .map((c) => csvEscape(String(c)))
      .join(',')
  );

  return [`Company: ${companyName}`, `Period: ${periodLabel}`, '', header, ...lines].join('\n');
}

export function buildAttendanceSummaryText(
  companyName: string,
  periodLabel: string,
  records: AttendanceWithOffice[]
): string {
  const completed = records.filter((r) => r.checkInAt && r.checkOutAt).length;
  const open = records.filter((r) => r.checkInAt && !r.checkOutAt).length;
  const people = new Set(records.map((r) => r.employeeId)).size;

  const lines = [
    companyName,
    `Attendance summary · ${periodLabel}`,
    `${records.length} punches · ${people} people · ${completed} completed · ${open} open`,
    '',
    ...records.map((r) => {
      const note = r.locationValidationMessage?.startsWith('Admin')
        ? ` · ${r.locationValidationMessage}`
        : '';
      return `${r.employeeName ?? 'Employee'} (${r.employeeCode ?? '—'}) · ${r.officeName}
  In ${formatLocalDateTime(r.checkInAt)} · Out ${formatLocalDateTime(r.checkOutAt)}${note}`;
    }),
  ];
  return lines.join('\n');
}

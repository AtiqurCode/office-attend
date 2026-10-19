import * as XLSX from 'xlsx';

import { EMPLOYEE_PIN_LENGTH, isValidEmployeePin } from '@/constants/pin';
import { employeeProfileSchema } from '@/features/employees/schemas/employeeSchema';

/** Spreadsheet column keys (normalized headers). */
export const EMPLOYEE_SHEET_COLUMNS = [
  'employee_code',
  'full_name',
  'department',
  'designation',
  'email',
  'pin',
  'locations',
  'is_active',
] as const;

export type EmployeeSheetColumn = (typeof EMPLOYEE_SHEET_COLUMNS)[number];

export type EmployeeSheetRow = {
  rowNumber: number;
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
  email: string;
  /** Empty = keep existing PIN on update; required for new rows. */
  pin: string;
  /** Office names (matched case-insensitively). */
  locationNames: string[];
  /** undefined = leave unchanged on update / default active on create. */
  isActive: boolean | undefined;
};

export type EmployeeExportRow = {
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
  email: string;
  /** Always blank on export — never ship PIN hashes. */
  pin: string;
  locationNames: string[];
  isActive: boolean;
  pinSet: boolean;
};

function normalizeHeader(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function cellString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel may store PIN as number (e.g. 1234 → 1234, or 0123 → 123).
    return String(Math.trunc(value));
  }
  return String(value).trim();
}

function parseLocations(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseActive(raw: string): boolean | undefined {
  if (!raw.trim()) return undefined;
  const v = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'active'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'inactive'].includes(v)) return false;
  return undefined;
}

/** Build .xlsx (base64) of current employees + blank PIN column. */
export function buildEmployeesWorkbookBase64(rows: EmployeeExportRow[]): string {
  const header = [
    ...EMPLOYEE_SHEET_COLUMNS,
    'pin_set',
  ];
  const data = rows.map((r) => [
    r.employeeCode,
    r.fullName,
    r.department,
    r.designation,
    r.email,
    '', // never export PIN
    r.locationNames.join(', '),
    r.isActive ? 'yes' : 'no',
    r.pinSet ? 'yes' : 'no',
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  ws['!cols'] = header.map((h) => ({ wch: Math.max(12, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');

  const instructions = [
    ['Office Attend — employee bulk sheet'],
    [''],
    ['Column', 'Required', 'Notes'],
    ['employee_code', 'Yes', 'Unique code. Matching code updates that person.'],
    ['full_name', 'Yes', 'Display name on Punch list.'],
    ['department', 'No', ''],
    ['designation', 'No', ''],
    ['email', 'No', 'Must be valid if filled.'],
    [
      'pin',
      `New = yes (${EMPLOYEE_PIN_LENGTH} digits)`,
      'Leave blank on update to keep current PIN. Never exported.',
    ],
    [
      'locations',
      'Recommended',
      'Comma-separated site names (must match Admin → Sites). Empty on update = keep current.',
    ],
    ['is_active', 'No', 'yes / no. Empty on update = keep current.'],
    ['pin_set', 'Export only', 'Ignored on upload. Shows whether a PIN is already stored.'],
    [''],
    ['Tips'],
    ['1. Download template or export current people, edit in Excel, then Upload.'],
    ['2. Format the pin column as Text in Excel so leading zeros are kept.'],
    ['3. Photos / face enroll are not in the sheet — set those in the app.'],
  ];
  const wsHelp = XLSX.utils.aoa_to_sheet(instructions);
  wsHelp['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 72 }];
  XLSX.utils.book_append_sheet(wb, wsHelp, 'Instructions');

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
}

/** Empty template with one sample row. */
export function buildEmployeeTemplateWorkbookBase64(sampleLocationName?: string): string {
  return buildEmployeesWorkbookBase64([
    {
      employeeCode: 'E001',
      fullName: 'Sample Person',
      department: 'Operations',
      designation: 'Staff',
      email: '',
      pin: '',
      locationNames: sampleLocationName ? [sampleLocationName] : [],
      isActive: true,
      pinSet: false,
    },
  ]);
}

export type ParseEmployeeSheetResult = {
  rows: EmployeeSheetRow[];
  errors: string[];
};

/** Parse first sheet of an .xlsx / .xls / .csv (base64). */
export function parseEmployeesWorkbookBase64(base64: string): ParseEmployeeSheetResult {
  const wb = XLSX.read(base64, { type: 'base64', cellDates: false, raw: false });
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase() === 'employees') ?? wb.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: ['Workbook has no sheets.'] };
  }
  const sheet = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!aoa.length) {
    return { rows: [], errors: ['Sheet is empty.'] };
  }

  const headerRow = (aoa[0] ?? []).map(normalizeHeader);
  const colIndex = (key: string) => headerRow.indexOf(key);

  const required = ['employee_code', 'full_name'] as const;
  for (const key of required) {
    if (colIndex(key) < 0) {
      return {
        rows: [],
        errors: [
          `Missing column "${key}". Expected headers: ${EMPLOYEE_SHEET_COLUMNS.join(', ')}`,
        ],
      };
    }
  }

  const rows: EmployeeSheetRow[] = [];
  const errors: string[] = [];
  const seenCodes = new Set<string>();

  for (let i = 1; i < aoa.length; i++) {
    const line = aoa[i] ?? [];
    const get = (key: EmployeeSheetColumn | 'pin_set') => {
      const idx = colIndex(key);
      return idx >= 0 ? cellString(line[idx]) : '';
    };

    const employeeCode = get('employee_code');
    const fullName = get('full_name');
    const department = get('department');
    const designation = get('designation');
    const email = get('email');
    const pin = get('pin');
    const locationNames = parseLocations(get('locations'));
    const isActive = parseActive(get('is_active'));

    // Skip fully blank rows
    if (!employeeCode && !fullName && !pin && !department && !email) continue;

    const rowNumber = i + 1;
    const profile = employeeProfileSchema.safeParse({
      employeeCode,
      fullName,
      department,
      designation,
      email,
    });
    if (!profile.success) {
      const msg = profile.error.issues.map((x) => x.message).join('; ');
      errors.push(`Row ${rowNumber}: ${msg}`);
      continue;
    }

    const codeKey = profile.data.employeeCode.toLowerCase();
    if (seenCodes.has(codeKey)) {
      errors.push(`Row ${rowNumber}: duplicate employee_code "${profile.data.employeeCode}" in file.`);
      continue;
    }
    seenCodes.add(codeKey);

    if (pin && !isValidEmployeePin(pin)) {
      errors.push(
        `Row ${rowNumber}: pin must be exactly ${EMPLOYEE_PIN_LENGTH} digits (or leave blank on update).`
      );
      continue;
    }

    rows.push({
      rowNumber,
      employeeCode: profile.data.employeeCode,
      fullName: profile.data.fullName,
      department: profile.data.department ?? '',
      designation: profile.data.designation ?? '',
      email: profile.data.email ?? '',
      pin,
      locationNames,
      isActive,
    });
  }

  return { rows, errors };
}

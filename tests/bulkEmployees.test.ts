import * as XLSX from 'xlsx';

import {
  buildEmployeesWorkbookBase64,
  parseEmployeesWorkbookBase64,
} from '@/features/employees/bulkEmployees';

describe('bulkEmployees sheet', () => {
  it('round-trips export → parse', () => {
    const base64 = buildEmployeesWorkbookBase64([
      {
        employeeCode: 'E001',
        fullName: 'Ada Lovelace',
        department: 'Eng',
        designation: 'Dev',
        email: 'ada@example.com',
        pin: '',
        locationNames: ['Main Office'],
        isActive: true,
        pinSet: true,
      },
    ]);

    const parsed = parseEmployeesWorkbookBase64(base64);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].employeeCode).toBe('E001');
    expect(parsed.rows[0].fullName).toBe('Ada Lovelace');
    expect(parsed.rows[0].locationNames).toEqual(['Main Office']);
    expect(parsed.rows[0].pin).toBe('');
    expect(parsed.rows[0].isActive).toBe(true);
  });

  it('rejects invalid pin length', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['employee_code', 'full_name', 'pin'],
      ['E002', 'Test User', '12345'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    const bad = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
    const result = parseEmployeesWorkbookBase64(bad);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.some((e) => /pin/i.test(e))).toBe(true);
  });
});

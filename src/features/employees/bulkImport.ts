import type { Employee } from '@/features/employees/types';
import type { Office } from '@/features/offices/types';
import type { ServiceContainer } from '@/services/ServiceContainer';

import type { EmployeeSheetRow } from './bulkEmployees';

export type BulkImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

type BulkDeps = Pick<ServiceContainer, 'employees' | 'offices'>;

function resolveOfficeIds(
  names: string[],
  offices: Office[],
  rowNumber: number,
  errors: string[]
): string[] | null {
  if (names.length === 0) return [];
  const byName = new Map(offices.map((o) => [o.name.trim().toLowerCase(), o]));
  const ids: string[] = [];
  for (const name of names) {
    const office = byName.get(name.trim().toLowerCase());
    if (!office) {
      errors.push(
        `Row ${rowNumber}: unknown location "${name}". Use exact names from Admin → Sites.`
      );
      return null;
    }
    ids.push(office.id);
  }
  return [...new Set(ids)];
}

/**
 * Upsert employees by employee_code into the active employee store
 * (Firestore when Firebase is configured — never Excel-only).
 * PIN required for creates; optional for updates.
 * locations empty on update → keep existing; empty on create → auto-assign if one site.
 */
export async function importEmployeeSheetRows(
  services: BulkDeps & { backend?: 'firebase' | 'sqlite' },
  companyId: string,
  rows: EmployeeSheetRow[]
): Promise<BulkImportResult> {
  if (services.backend && services.backend !== 'firebase') {
    throw new Error(
      'Firebase/Firestore is required to save employees. Check EXPO_PUBLIC_FIREBASE_* and restart Expo.'
    );
  }

  const offices = await services.offices.listByCompany(companyId);
  const existing = await services.employees.listByCompany(companyId);
  // listByCompany filters active — also need inactive for code match; getByCode covers that.
  const byCode = new Map(
    existing.map((e) => [e.employeeCode.trim().toLowerCase(), e] as const)
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const codeKey = row.employeeCode.trim().toLowerCase();
    let current: Employee | null = byCode.get(codeKey) ?? null;
    if (!current) {
      current = await services.employees.getByCode(row.employeeCode);
      if (current && current.companyId && current.companyId !== companyId) {
        errors.push(
          `Row ${row.rowNumber}: employee_code "${row.employeeCode}" belongs to another company.`
        );
        skipped += 1;
        continue;
      }
    }

    const locationIds = resolveOfficeIds(row.locationNames, offices, row.rowNumber, errors);
    if (locationIds === null) {
      skipped += 1;
      continue;
    }

    const profile = {
      employeeCode: row.employeeCode,
      fullName: row.fullName,
      department: row.department,
      designation: row.designation,
      email: row.email,
    };

    try {
      if (!current) {
        if (!row.pin) {
          errors.push(
            `Row ${row.rowNumber}: pin is required for new employee "${row.employeeCode}".`
          );
          skipped += 1;
          continue;
        }

        let officeIds = locationIds;
        if (officeIds.length === 0) {
          if (offices.length === 1) {
            officeIds = [offices[0].id];
          } else if (offices.length === 0) {
            errors.push(
              `Row ${row.rowNumber}: no sites exist. Add a location before importing people.`
            );
            skipped += 1;
            continue;
          } else {
            errors.push(
              `Row ${row.rowNumber}: locations required when the company has multiple sites.`
            );
            skipped += 1;
            continue;
          }
        }

        const createdEmp = await services.employees.create({
          ...profile,
          companyId,
          pin: row.pin,
        });
        await services.employees.setOfficeIds(createdEmp.id, officeIds);
        if (row.isActive === false) {
          await services.employees.setActive(createdEmp.id, false);
        }
        byCode.set(codeKey, createdEmp);
        created += 1;
      } else {
        await services.employees.update(current.id, profile);
        if (row.pin) {
          await services.employees.setPin(current.id, row.pin);
        }
        if (row.locationNames.length > 0) {
          await services.employees.setOfficeIds(current.id, locationIds);
        }
        if (row.isActive !== undefined) {
          await services.employees.setActive(current.id, row.isActive);
        }
        updated += 1;
      }
    } catch (e) {
      errors.push(
        `Row ${row.rowNumber}: ${e instanceof Error ? e.message : 'Could not save employee.'}`
      );
      skipped += 1;
    }
  }

  return { created, updated, skipped, errors };
}

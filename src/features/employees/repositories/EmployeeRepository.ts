import type { SQLiteDatabase } from 'expo-sqlite';

import { serializeAuthMethods, type AuthMethod } from '@/constants/auth';
import {
  FaceEnrollmentStatuses,
  type FaceEnrollmentStatus,
} from '@/constants/status';
import type { EmployeeProfileInput } from '@/features/employees/schemas/employeeSchema';
import {
  mapEmployeeRow,
  type Employee,
  type EmployeeRow,
} from '@/features/employees/types';
import { mapOfficeRow, type Office, type OfficeRow } from '@/features/offices/types';
import { nowUtcIso } from '@/utils/datetime';
import { hashEmployeePin, verifyEmployeePin } from '@/utils/pinHash';
import { createId } from '@/utils/uuid';

export class EmployeeRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listByCompany(companyId: string): Promise<Employee[]> {
    const rows = await this.db.getAllAsync<EmployeeRow>(
      `SELECT * FROM employees
       WHERE company_id = ? AND is_active = 1
       ORDER BY full_name ASC`,
      companyId
    );
    return rows.map(mapEmployeeRow);
  }

  async listAllActive(): Promise<Employee[]> {
    const rows = await this.db.getAllAsync<EmployeeRow>(
      `SELECT * FROM employees WHERE is_active = 1 ORDER BY full_name ASC`
    );
    return rows.map(mapEmployeeRow);
  }

  /** @deprecated Prefer listByCompany for kiosk mode */
  async getActiveEmployee(): Promise<Employee | null> {
    const row = await this.db.getFirstAsync<EmployeeRow>(
      `SELECT * FROM employees WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1`
    );
    return row ? mapEmployeeRow(row) : null;
  }

  async getById(id: string): Promise<Employee | null> {
    const row = await this.db.getFirstAsync<EmployeeRow>(
      'SELECT * FROM employees WHERE id = ?',
      id
    );
    return row ? mapEmployeeRow(row) : null;
  }

  async getByCode(employeeCode: string): Promise<Employee | null> {
    const row = await this.db.getFirstAsync<EmployeeRow>(
      'SELECT * FROM employees WHERE employee_code = ? COLLATE NOCASE',
      employeeCode.trim()
    );
    return row ? mapEmployeeRow(row) : null;
  }

  async create(
    input: EmployeeProfileInput & {
      companyId: string;
      pin?: string;
      authMethods?: AuthMethod[] | null;
    }
  ): Promise<Employee> {
    const id = createId();
    const now = nowUtcIso();
    const pinHash = input.pin ? await hashEmployeePin(id, input.pin) : null;
    await this.db.runAsync(
      `INSERT INTO employees (
        id, company_id, employee_code, full_name, department, designation, email,
        profile_image_path, face_enrollment_status, reference_face_path,
        face_embedding, face_enrolled_at, pin_hash, auth_methods,
        device_enrolled, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, NULL, ?, ?, 0, 1, ?, ?)`,
      id,
      input.companyId,
      input.employeeCode.trim(),
      input.fullName.trim(),
      input.department?.trim() || null,
      input.designation?.trim() || null,
      input.email?.trim() || null,
      FaceEnrollmentStatuses.NOT_ENROLLED,
      pinHash,
      input.authMethods ? serializeAuthMethods(input.authMethods) : null,
      now,
      now
    );
    const created = await this.getById(id);
    if (!created) throw new Error('Failed to create employee');
    return created;
  }

  async update(id: string, input: EmployeeProfileInput): Promise<Employee> {
    const now = nowUtcIso();
    await this.db.runAsync(
      `UPDATE employees SET
        employee_code = ?, full_name = ?, department = ?, designation = ?,
        email = ?, updated_at = ?
      WHERE id = ?`,
      input.employeeCode.trim(),
      input.fullName.trim(),
      input.department?.trim() || null,
      input.designation?.trim() || null,
      input.email?.trim() || null,
      now,
      id
    );
    const updated = await this.getById(id);
    if (!updated) throw new Error('Employee not found');
    return updated;
  }

  async setPin(id: string, pin: string): Promise<void> {
    const pinHash = await hashEmployeePin(id, pin);
    await this.db.runAsync(
      'UPDATE employees SET pin_hash = ?, updated_at = ? WHERE id = ?',
      pinHash,
      nowUtcIso(),
      id
    );
  }

  async verifyPin(id: string, pin: string): Promise<boolean> {
    const employee = await this.getById(id);
    if (!employee) return false;
    return verifyEmployeePin(id, pin, employee.pinHash);
  }

  async setProfileImage(id: string, path: string | null): Promise<void> {
    await this.db.runAsync(
      'UPDATE employees SET profile_image_path = ?, updated_at = ? WHERE id = ?',
      path,
      nowUtcIso(),
      id
    );
  }

  async setFaceEnrollment(
    id: string,
    status: FaceEnrollmentStatus,
    referenceFacePath: string | null,
    embedding?: number[] | null
  ): Promise<void> {
    const now = nowUtcIso();
    await this.db.runAsync(
      `UPDATE employees SET
        face_enrollment_status = ?, reference_face_path = ?,
        face_embedding = ?, face_enrolled_at = ?,
        device_enrolled = ?, updated_at = ?
      WHERE id = ?`,
      status,
      referenceFacePath,
      embedding ? JSON.stringify(embedding) : null,
      status === FaceEnrollmentStatuses.ENROLLED ? now : null,
      status === FaceEnrollmentStatuses.ENROLLED ? 1 : 0,
      now,
      id
    );
  }

  async setFaceEmbedding(id: string, embedding: number[]): Promise<void> {
    const now = nowUtcIso();
    await this.db.runAsync(
      `UPDATE employees SET
        face_embedding = ?, face_enrolled_at = ?,
        face_enrollment_status = ?, device_enrolled = 1, updated_at = ?
      WHERE id = ?`,
      JSON.stringify(embedding),
      now,
      FaceEnrollmentStatuses.ENROLLED,
      now,
      id
    );
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.db.runAsync(
      'UPDATE employees SET is_active = ?, updated_at = ? WHERE id = ?',
      isActive ? 1 : 0,
      nowUtcIso(),
      id
    );
  }

  async deleteAll(): Promise<void> {
    await this.db.runAsync('DELETE FROM employee_offices');
    await this.db.runAsync('DELETE FROM employees');
  }

  async listOfficeIds(employeeId: string): Promise<string[]> {
    const rows = await this.db.getAllAsync<{ office_id: string }>(
      'SELECT office_id FROM employee_offices WHERE employee_id = ?',
      employeeId
    );
    return rows.map((r) => r.office_id);
  }

  async listOffices(employeeId: string): Promise<Office[]> {
    const rows = await this.db.getAllAsync<OfficeRow>(
      `SELECT o.* FROM offices o
       INNER JOIN employee_offices eo ON eo.office_id = o.id
       WHERE eo.employee_id = ? AND o.is_active = 1
       ORDER BY o.name ASC`,
      employeeId
    );
    return rows.map(mapOfficeRow);
  }

  async listByCompanyAndOffice(companyId: string, officeId: string): Promise<Employee[]> {
    const rows = await this.db.getAllAsync<EmployeeRow>(
      `SELECT e.* FROM employees e
       INNER JOIN employee_offices eo ON eo.employee_id = e.id
       WHERE e.company_id = ? AND eo.office_id = ? AND e.is_active = 1
       ORDER BY e.full_name ASC`,
      companyId,
      officeId
    );
    return rows.map(mapEmployeeRow);
  }

  async setOfficeIds(employeeId: string, officeIds: string[]): Promise<void> {
    const now = nowUtcIso();
    const unique = [...new Set(officeIds.filter(Boolean))];
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM employee_offices WHERE employee_id = ?', employeeId);
      for (const officeId of unique) {
        await this.db.runAsync(
          `INSERT INTO employee_offices (employee_id, office_id, created_at)
           VALUES (?, ?, ?)`,
          employeeId,
          officeId,
          now
        );
      }
    });
  }
}

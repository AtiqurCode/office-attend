import type { SQLiteDatabase } from 'expo-sqlite';

import {
  mapAttendanceRow,
  type AttendanceRecord,
  type AttendanceRecordRow,
  type AttendanceWithOffice,
  type MonthlySummary,
} from '@/features/attendance/types';
import { nowUtcIso } from '@/utils/datetime';

export type CreateAttendanceInput = Omit<
  AttendanceRecord,
  'createdAt' | 'updatedAt'
>;

export class AttendanceRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getById(id: string): Promise<AttendanceRecord | null> {
    const row = await this.db.getFirstAsync<AttendanceRecordRow>(
      'SELECT * FROM attendance_records WHERE id = ?',
      id
    );
    return row ? mapAttendanceRow(row) : null;
  }

  async getOpenCheckIn(employeeId: string): Promise<AttendanceRecord | null> {
    const row = await this.db.getFirstAsync<AttendanceRecordRow>(
      `SELECT * FROM attendance_records
       WHERE employee_id = ?
         AND check_in_at IS NOT NULL
         AND check_out_at IS NULL
         AND attendance_status != 'rejected'
       ORDER BY check_in_at DESC
       LIMIT 1`,
      employeeId
    );
    return row ? mapAttendanceRow(row) : null;
  }

  async listForEmployee(
    employeeId: string,
    startUtc?: string,
    endUtc?: string
  ): Promise<AttendanceWithOffice[]> {
    let sql = `
      SELECT a.*, o.name AS office_name, e.full_name AS employee_name, e.employee_code AS employee_code
      FROM attendance_records a
      JOIN offices o ON o.id = a.office_id
      JOIN employees e ON e.id = a.employee_id
      WHERE a.employee_id = ?
    `;
    const params: (string | number)[] = [employeeId];
    if (startUtc && endUtc) {
      sql += ' AND a.check_in_at >= ? AND a.check_in_at <= ?';
      params.push(startUtc, endUtc);
    }
    sql += ' ORDER BY a.check_in_at DESC';

    const rows = await this.db.getAllAsync<
      AttendanceRecordRow & {
        office_name: string;
        employee_name: string;
        employee_code: string;
      }
    >(sql, ...params);
    return rows.map((row) => ({
      ...mapAttendanceRow(row),
      officeName: row.office_name,
      employeeName: row.employee_name,
      employeeCode: row.employee_code,
    }));
  }

  async listTodayForCompany(
    companyId: string,
    startUtc: string,
    endUtc: string
  ): Promise<AttendanceWithOffice[]> {
    return this.listForCompanyInRange(companyId, startUtc, endUtc);
  }

  async listForCompanyInRange(
    companyId: string,
    startUtc: string,
    endUtc: string
  ): Promise<AttendanceWithOffice[]> {
    const rows = await this.db.getAllAsync<
      AttendanceRecordRow & {
        office_name: string;
        employee_name: string;
        employee_code: string;
        profile_image_path: string | null;
      }
    >(
      `SELECT a.*, o.name AS office_name, e.full_name AS employee_name,
              e.employee_code AS employee_code, e.profile_image_path AS profile_image_path
       FROM attendance_records a
       JOIN offices o ON o.id = a.office_id
       JOIN employees e ON e.id = a.employee_id
       WHERE e.company_id = ?
         AND a.check_in_at >= ?
         AND a.check_in_at <= ?
         AND a.attendance_status != 'rejected'
       ORDER BY a.check_in_at DESC`,
      companyId,
      startUtc,
      endUtc
    );
    return rows.map((row) => ({
      ...mapAttendanceRow(row),
      officeName: row.office_name,
      employeeName: row.employee_name,
      employeeCode: row.employee_code,
      profileImagePath: row.profile_image_path,
    }));
  }

  async getMonthlySummary(
    employeeId: string,
    startUtc: string,
    endUtc: string
  ): Promise<MonthlySummary> {
    const rows = await this.db.getAllAsync<{
      day: string;
      check_out_at: string | null;
    }>(
      `SELECT substr(check_in_at, 1, 10) AS day, check_out_at
       FROM attendance_records
       WHERE employee_id = ?
         AND check_in_at >= ?
         AND check_in_at <= ?
         AND attendance_status != 'rejected'`,
      employeeId,
      startUtc,
      endUtc
    );

    const days = new Set(rows.map((r) => r.day));
    const completedPairs = rows.filter((r) => r.check_out_at != null).length;
    const incompleteRecords = rows.filter((r) => r.check_out_at == null).length;

    return {
      recordedDays: days.size,
      completedPairs,
      incompleteRecords,
    };
  }

  async create(input: CreateAttendanceInput): Promise<AttendanceRecord> {
    const now = nowUtcIso();
    await this.db.runAsync(
      `INSERT INTO attendance_records (
        id, employee_id, office_id, check_in_at, check_out_at,
        check_in_latitude, check_in_longitude, check_in_accuracy_meters, check_in_distance_meters,
        check_out_latitude, check_out_longitude, check_out_accuracy_meters, check_out_distance_meters,
        face_detection_status, face_verification_status, biometric_gate_status, identity_method,
        geofence_status, attendance_status, rejection_reason, sync_status,
        location_permission_status, location_validation_message,
        check_in_location_label, check_out_location_label, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.id,
      input.employeeId,
      input.officeId,
      input.checkInAt,
      input.checkOutAt,
      input.checkInLatitude,
      input.checkInLongitude,
      input.checkInAccuracyMeters,
      input.checkInDistanceMeters,
      input.checkOutLatitude,
      input.checkOutLongitude,
      input.checkOutAccuracyMeters,
      input.checkOutDistanceMeters,
      input.faceDetectionStatus,
      input.faceVerificationStatus,
      input.biometricGateStatus,
      input.identityMethod,
      input.geofenceStatus,
      input.attendanceStatus,
      input.rejectionReason,
      input.syncStatus,
      input.locationPermissionStatus,
      input.locationValidationMessage,
      input.checkInLocationLabel,
      input.checkOutLocationLabel,
      now,
      now
    );
    const created = await this.getById(input.id);
    if (!created) throw new Error('Failed to create attendance record');
    return created;
  }

  async updateCheckout(
    id: string,
    patch: Partial<
      Pick<
        AttendanceRecord,
        | 'checkOutAt'
        | 'checkOutLatitude'
        | 'checkOutLongitude'
        | 'checkOutAccuracyMeters'
        | 'checkOutDistanceMeters'
        | 'faceDetectionStatus'
        | 'faceVerificationStatus'
        | 'biometricGateStatus'
        | 'identityMethod'
        | 'geofenceStatus'
        | 'attendanceStatus'
        | 'rejectionReason'
        | 'syncStatus'
        | 'locationPermissionStatus'
        | 'locationValidationMessage'
        | 'checkOutLocationLabel'
      >
    >
  ): Promise<AttendanceRecord> {
    const now = nowUtcIso();
    await this.db.runAsync(
      `UPDATE attendance_records SET
        check_out_at = COALESCE(?, check_out_at),
        check_out_latitude = COALESCE(?, check_out_latitude),
        check_out_longitude = COALESCE(?, check_out_longitude),
        check_out_accuracy_meters = COALESCE(?, check_out_accuracy_meters),
        check_out_distance_meters = COALESCE(?, check_out_distance_meters),
        face_detection_status = COALESCE(?, face_detection_status),
        face_verification_status = COALESCE(?, face_verification_status),
        biometric_gate_status = COALESCE(?, biometric_gate_status),
        identity_method = COALESCE(?, identity_method),
        geofence_status = COALESCE(?, geofence_status),
        attendance_status = COALESCE(?, attendance_status),
        rejection_reason = COALESCE(?, rejection_reason),
        sync_status = COALESCE(?, sync_status),
        location_permission_status = COALESCE(?, location_permission_status),
        location_validation_message = COALESCE(?, location_validation_message),
        check_out_location_label = COALESCE(?, check_out_location_label),
        updated_at = ?
      WHERE id = ?`,
      patch.checkOutAt ?? null,
      patch.checkOutLatitude ?? null,
      patch.checkOutLongitude ?? null,
      patch.checkOutAccuracyMeters ?? null,
      patch.checkOutDistanceMeters ?? null,
      patch.faceDetectionStatus ?? null,
      patch.faceVerificationStatus ?? null,
      patch.biometricGateStatus ?? null,
      patch.identityMethod ?? null,
      patch.geofenceStatus ?? null,
      patch.attendanceStatus ?? null,
      patch.rejectionReason ?? null,
      patch.syncStatus ?? null,
      patch.locationPermissionStatus ?? null,
      patch.locationValidationMessage ?? null,
      patch.checkOutLocationLabel ?? null,
      now,
      id
    );
    const updated = await this.getById(id);
    if (!updated) throw new Error('Attendance record not found');
    return updated;
  }

  async deleteAll(): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM attendance_evidence');
      await this.db.runAsync('DELETE FROM attendance_records');
    });
  }

  async insertEvidence(input: {
    id: string;
    attendanceId: string;
    evidenceType: string;
    localFilePath: string;
    capturedAt: string;
    retentionStatus: string;
  }): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO attendance_evidence (
        id, attendance_id, evidence_type, local_file_path, captured_at, retention_status
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      input.id,
      input.attendanceId,
      input.evidenceType,
      input.localFilePath,
      input.capturedAt,
      input.retentionStatus
    );
  }

  async listEvidence(attendanceId: string): Promise<
    {
      id: string;
      attendanceId: string;
      evidenceType: string;
      localFilePath: string;
      capturedAt: string;
      retentionStatus: string;
    }[]
  > {
    const rows = await this.db.getAllAsync<{
      id: string;
      attendance_id: string;
      evidence_type: string;
      local_file_path: string;
      captured_at: string;
      retention_status: string;
    }>(
      `SELECT id, attendance_id, evidence_type, local_file_path, captured_at, retention_status
       FROM attendance_evidence
       WHERE attendance_id = ?
       ORDER BY captured_at ASC`,
      attendanceId
    );
    return rows.map((r) => ({
      id: r.id,
      attendanceId: r.attendance_id,
      evidenceType: r.evidence_type,
      localFilePath: r.local_file_path,
      capturedAt: r.captured_at,
      retentionStatus: r.retention_status,
    }));
  }
}

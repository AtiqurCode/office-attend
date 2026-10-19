import {
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import type { AuthMethod } from '@/constants/auth';
import type {
  AttendanceStatus,
  BiometricGateStatus,
  FaceDetectionStatus,
  FaceVerificationStatus,
  GeofenceStatus,
  SyncStatus,
} from '@/constants/status';
import type { CreateAttendanceInput } from '@/features/attendance/repositories/AttendanceRepository';
import type {
  AttendanceRecord,
  AttendanceWithOffice,
  MonthlySummary,
} from '@/features/attendance/types';
import { getBoundCompanyId } from '@/firebase/deviceBinding';
import { getFirestoreDb } from '@/firebase/config';
import { assertOnline } from '@/firebase/online';
import {
  attendanceCol,
  attendanceDoc,
  employeeDoc,
  evidenceCol,
  officeDoc,
} from '@/firebase/paths';
import { nowUtcIso } from '@/utils/datetime';

type AttendanceDoc = {
  companyId: string;
  employeeId: string;
  officeId: string;
  /** True while checked in and not rejected — used for open-session queries. */
  isOpen: boolean;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkInAccuracyMeters: number | null;
  checkInDistanceMeters: number | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutAccuracyMeters: number | null;
  checkOutDistanceMeters: number | null;
  faceDetectionStatus: FaceDetectionStatus;
  faceVerificationStatus: FaceVerificationStatus;
  biometricGateStatus: BiometricGateStatus | null;
  identityMethod: AuthMethod | null;
  geofenceStatus: GeofenceStatus;
  attendanceStatus: AttendanceStatus;
  rejectionReason: string | null;
  syncStatus: SyncStatus;
  locationPermissionStatus: string | null;
  locationValidationMessage: string | null;
  checkInLocationLabel: string | null;
  checkOutLocationLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRecord(id: string, data: AttendanceDoc): AttendanceRecord {
  return {
    id,
    employeeId: data.employeeId,
    officeId: data.officeId,
    checkInAt: data.checkInAt,
    checkOutAt: data.checkOutAt,
    checkInLatitude: data.checkInLatitude,
    checkInLongitude: data.checkInLongitude,
    checkInAccuracyMeters: data.checkInAccuracyMeters,
    checkInDistanceMeters: data.checkInDistanceMeters,
    checkOutLatitude: data.checkOutLatitude,
    checkOutLongitude: data.checkOutLongitude,
    checkOutAccuracyMeters: data.checkOutAccuracyMeters,
    checkOutDistanceMeters: data.checkOutDistanceMeters,
    faceDetectionStatus: data.faceDetectionStatus,
    faceVerificationStatus: data.faceVerificationStatus,
    biometricGateStatus: data.biometricGateStatus,
    identityMethod: data.identityMethod,
    geofenceStatus: data.geofenceStatus,
    attendanceStatus: data.attendanceStatus,
    rejectionReason: data.rejectionReason,
    syncStatus: data.syncStatus,
    locationPermissionStatus: data.locationPermissionStatus,
    locationValidationMessage: data.locationValidationMessage,
    checkInLocationLabel: data.checkInLocationLabel,
    checkOutLocationLabel: data.checkOutLocationLabel,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export class FirestoreAttendanceRepository {
  private db = getFirestoreDb();

  private async requireCompanyId(): Promise<string> {
    const id = await getBoundCompanyId();
    if (!id) throw new Error('No company bound. Complete setup first.');
    return id;
  }

  async getById(id: string): Promise<AttendanceRecord | null> {
    await assertOnline();
    const companyId = await this.requireCompanyId();
    const snap = await getDoc(attendanceDoc(this.db, companyId, id));
    if (!snap.exists()) return null;
    return mapRecord(snap.id, snap.data() as AttendanceDoc);
  }

  async getOpenCheckIn(employeeId: string): Promise<AttendanceRecord | null> {
    await assertOnline();
    const companyId = await this.requireCompanyId();
    const snap = await getDocs(
      query(attendanceCol(this.db, companyId), where('employeeId', '==', employeeId))
    );
    const open = snap.docs
      .map((d) => mapRecord(d.id, d.data() as AttendanceDoc))
      .filter(
        (r) =>
          r.checkInAt != null &&
          r.checkOutAt == null &&
          r.attendanceStatus !== 'rejected'
      )
      .sort((a, b) => (b.checkInAt ?? '').localeCompare(a.checkInAt ?? ''))[0];
    return open ?? null;
  }

  async listForEmployee(
    employeeId: string,
    startUtc?: string,
    endUtc?: string
  ): Promise<AttendanceWithOffice[]> {
    await assertOnline();
    const companyId = await this.requireCompanyId();
    const snap = await getDocs(
      query(
        attendanceCol(this.db, companyId),
        where('employeeId', '==', employeeId),
        orderBy('checkInAt', 'desc')
      )
    );
    const records = snap.docs
      .map((d) => mapRecord(d.id, d.data() as AttendanceDoc))
      .filter((r) => {
        if (!startUtc || !endUtc || !r.checkInAt) return true;
        return r.checkInAt >= startUtc && r.checkInAt <= endUtc;
      });
    return this.enrich(companyId, records);
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
    await assertOnline();
    const snap = await getDocs(
      query(
        attendanceCol(this.db, companyId),
        where('checkInAt', '>=', startUtc),
        where('checkInAt', '<=', endUtc),
        orderBy('checkInAt', 'desc')
      )
    );
    const records = snap.docs
      .map((d) => mapRecord(d.id, d.data() as AttendanceDoc))
      .filter((r) => r.attendanceStatus !== 'rejected');
    return this.enrich(companyId, records);
  }

  private async enrich(
    companyId: string,
    records: AttendanceRecord[]
  ): Promise<AttendanceWithOffice[]> {
    const out: AttendanceWithOffice[] = [];
    for (const record of records) {
      const [empSnap, officeSnap] = await Promise.all([
        getDoc(employeeDoc(this.db, companyId, record.employeeId)),
        getDoc(officeDoc(this.db, companyId, record.officeId)),
      ]);
      const emp = empSnap.exists()
        ? (empSnap.data() as {
            fullName?: string;
            employeeCode?: string;
            profileImagePath?: string | null;
          })
        : {};
      const office = officeSnap.exists()
        ? (officeSnap.data() as { name?: string })
        : {};
      out.push({
        ...record,
        officeName: office.name ?? '—',
        employeeName: emp.fullName,
        employeeCode: emp.employeeCode,
        profileImagePath: emp.profileImagePath ?? null,
      });
    }
    return out;
  }

  async getMonthlySummary(
    employeeId: string,
    startUtc: string,
    endUtc: string
  ): Promise<MonthlySummary> {
    const rows = await this.listForEmployee(employeeId, startUtc, endUtc);
    const accepted = rows.filter((r) => r.attendanceStatus !== 'rejected');
    const days = new Set(
      accepted.map((r) => (r.checkInAt ? r.checkInAt.slice(0, 10) : '')).filter(Boolean)
    );
    return {
      recordedDays: days.size,
      completedPairs: accepted.filter((r) => r.checkOutAt != null).length,
      incompleteRecords: accepted.filter((r) => r.checkOutAt == null).length,
    };
  }

  async create(input: CreateAttendanceInput & { companyId?: string }): Promise<AttendanceRecord> {
    await assertOnline();
    const companyId = input.companyId || (await this.requireCompanyId());
    const now = nowUtcIso();
    const isOpen =
      input.checkInAt != null &&
      input.checkOutAt == null &&
      input.attendanceStatus !== 'rejected';
    const data: AttendanceDoc = {
      companyId,
      employeeId: input.employeeId,
      officeId: input.officeId,
      isOpen,
      checkInAt: input.checkInAt,
      checkOutAt: input.checkOutAt,
      checkInLatitude: input.checkInLatitude,
      checkInLongitude: input.checkInLongitude,
      checkInAccuracyMeters: input.checkInAccuracyMeters,
      checkInDistanceMeters: input.checkInDistanceMeters,
      checkOutLatitude: input.checkOutLatitude,
      checkOutLongitude: input.checkOutLongitude,
      checkOutAccuracyMeters: input.checkOutAccuracyMeters,
      checkOutDistanceMeters: input.checkOutDistanceMeters,
      faceDetectionStatus: input.faceDetectionStatus,
      faceVerificationStatus: input.faceVerificationStatus,
      biometricGateStatus: input.biometricGateStatus,
      identityMethod: input.identityMethod,
      geofenceStatus: input.geofenceStatus,
      attendanceStatus: input.attendanceStatus,
      rejectionReason: input.rejectionReason,
      syncStatus: input.syncStatus,
      locationPermissionStatus: input.locationPermissionStatus,
      locationValidationMessage: input.locationValidationMessage,
      checkInLocationLabel: input.checkInLocationLabel,
      checkOutLocationLabel: input.checkOutLocationLabel,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(attendanceDoc(this.db, companyId, input.id), data);
    return mapRecord(input.id, data);
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
    await assertOnline();
    const companyId = await this.requireCompanyId();
    const now = nowUtcIso();
    await updateDoc(attendanceDoc(this.db, companyId, id), {
      ...patch,
      isOpen: false,
      updatedAt: now,
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error('Attendance record not found');
    return updated;
  }

  async deleteAll(): Promise<void> {
    await assertOnline();
    const companyId = await this.requireCompanyId();
    const snap = await getDocs(attendanceCol(this.db, companyId));
    const batch = writeBatch(this.db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async insertEvidence(input: {
    id: string;
    attendanceId: string;
    evidenceType: string;
    localFilePath: string;
    capturedAt: string;
    retentionStatus: string;
  }): Promise<void> {
    await assertOnline();
    const companyId = await this.requireCompanyId();
    await setDoc(
      doc(
        this.db,
        'companies',
        companyId,
        'attendance',
        input.attendanceId,
        'evidence',
        input.id
      ),
      {
        evidenceType: input.evidenceType,
        fileUrl: input.localFilePath,
        localFilePath: input.localFilePath,
        capturedAt: input.capturedAt,
        retentionStatus: input.retentionStatus,
      }
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
    await assertOnline();
    const companyId = await this.requireCompanyId();
    const snap = await getDocs(evidenceCol(this.db, companyId, attendanceId));
    return snap.docs.map((d) => {
      const data = d.data() as {
        evidenceType: string;
        localFilePath?: string;
        fileUrl?: string;
        capturedAt: string;
        retentionStatus: string;
      };
      return {
        id: d.id,
        attendanceId,
        evidenceType: data.evidenceType,
        localFilePath: data.fileUrl ?? data.localFilePath ?? '',
        capturedAt: data.capturedAt,
        retentionStatus: data.retentionStatus,
      };
    });
  }
}

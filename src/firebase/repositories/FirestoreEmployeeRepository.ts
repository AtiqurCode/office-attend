import { getDoc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

import type { AuthMethod } from '@/constants/auth';
import {
  FaceEnrollmentStatuses,
  type FaceEnrollmentStatus,
} from '@/constants/status';
import type { EmployeeProfileInput } from '@/features/employees/schemas/employeeSchema';
import type { Employee } from '@/features/employees/types';
import type { Office } from '@/features/offices/types';
import { getBoundCompanyId } from '@/firebase/deviceBinding';
import { getFirestoreDb } from '@/firebase/config';
import { assertOnline } from '@/firebase/online';
import { employeeDoc, employeesCol, officeDoc } from '@/firebase/paths';
import { nowUtcIso } from '@/utils/datetime';
import { hashEmployeePin, verifyEmployeePin } from '@/utils/pinHash';
import { createId } from '@/utils/uuid';

type EmployeeDoc = {
  companyId: string;
  employeeCode: string;
  fullName: string;
  department: string | null;
  designation: string | null;
  email: string | null;
  profileImagePath: string | null;
  faceEnrollmentStatus: FaceEnrollmentStatus;
  referenceFacePath: string | null;
  faceEmbedding: number[] | null;
  faceEnrolledAt: string | null;
  pinHash: string | null;
  authMethods: AuthMethod[] | null;
  officeIds: string[];
  deviceEnrolled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapEmployee(id: string, data: EmployeeDoc): Employee {
  return {
    id,
    companyId: data.companyId,
    employeeCode: data.employeeCode,
    fullName: data.fullName,
    department: data.department,
    designation: data.designation,
    email: data.email,
    profileImagePath: data.profileImagePath,
    faceEnrollmentStatus: data.faceEnrollmentStatus,
    referenceFacePath: data.referenceFacePath,
    faceEmbedding: data.faceEmbedding,
    faceEnrolledAt: data.faceEnrolledAt,
    pinHash: data.pinHash,
    authMethods: data.authMethods,
    deviceEnrolled: data.deviceEnrolled,
    isActive: data.isActive,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export class FirestoreEmployeeRepository {
  private get db() {
    return getFirestoreDb();
  }

  private async requireCompanyId(companyId?: string | null): Promise<string> {
    const id = companyId || (await getBoundCompanyId());
    if (!id) throw new Error('No company bound. Complete setup first.');
    return id;
  }

  async listByCompany(companyId: string): Promise<Employee[]> {
    await assertOnline();
    const snap = await getDocs(employeesCol(this.db, companyId));
    return snap.docs
      .map((d) => mapEmployee(d.id, d.data() as EmployeeDoc))
      .filter((e) => e.isActive)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async listAllActive(): Promise<Employee[]> {
    const companyId = await this.requireCompanyId();
    return this.listByCompany(companyId);
  }

  async getActiveEmployee(): Promise<Employee | null> {
    const list = await this.listAllActive();
    return list[0] ?? null;
  }

  async getById(id: string): Promise<Employee | null> {
    await assertOnline();
    const companyId = await this.requireCompanyId();
    const snap = await getDoc(employeeDoc(this.db, companyId, id));
    if (!snap.exists()) return null;
    return mapEmployee(snap.id, snap.data() as EmployeeDoc);
  }

  async getByCode(employeeCode: string): Promise<Employee | null> {
    await assertOnline();
    const companyId = await this.requireCompanyId();
    const code = employeeCode.trim().toLowerCase();
    const snap = await getDocs(employeesCol(this.db, companyId));
    const match = snap.docs.find(
      (d) => (d.data() as EmployeeDoc).employeeCode.trim().toLowerCase() === code
    );
    return match ? mapEmployee(match.id, match.data() as EmployeeDoc) : null;
  }

  async create(
    input: EmployeeProfileInput & {
      companyId: string;
      pin?: string;
      authMethods?: AuthMethod[] | null;
    }
  ): Promise<Employee> {
    await assertOnline();
    const id = createId();
    const now = nowUtcIso();
    const pinHash = input.pin ? await hashEmployeePin(id, input.pin) : null;
    const data: EmployeeDoc = {
      companyId: input.companyId,
      employeeCode: input.employeeCode.trim(),
      fullName: input.fullName.trim(),
      department: input.department?.trim() || null,
      designation: input.designation?.trim() || null,
      email: input.email?.trim() || null,
      profileImagePath: null,
      faceEnrollmentStatus: FaceEnrollmentStatuses.NOT_ENROLLED,
      referenceFacePath: null,
      faceEmbedding: null,
      faceEnrolledAt: null,
      pinHash,
      authMethods: input.authMethods ?? null,
      officeIds: [],
      deviceEnrolled: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(employeeDoc(this.db, input.companyId, id), data);
    return mapEmployee(id, data);
  }

  async update(id: string, input: EmployeeProfileInput): Promise<Employee> {
    await assertOnline();
    const existing = await this.getById(id);
    if (!existing?.companyId) throw new Error('Employee not found');
    const now = nowUtcIso();
    await updateDoc(employeeDoc(this.db, existing.companyId, id), {
      employeeCode: input.employeeCode.trim(),
      fullName: input.fullName.trim(),
      department: input.department?.trim() || null,
      designation: input.designation?.trim() || null,
      email: input.email?.trim() || null,
      updatedAt: now,
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error('Employee not found');
    return updated;
  }

  async setPin(id: string, pin: string): Promise<void> {
    await assertOnline();
    const existing = await this.getById(id);
    if (!existing?.companyId) throw new Error('Employee not found');
    const pinHash = await hashEmployeePin(id, pin);
    await updateDoc(employeeDoc(this.db, existing.companyId, id), {
      pinHash,
      updatedAt: nowUtcIso(),
    });
  }

  async verifyPin(id: string, pin: string): Promise<boolean> {
    const employee = await this.getById(id);
    if (!employee) return false;
    return verifyEmployeePin(id, pin, employee.pinHash);
  }

  async setProfileImage(id: string, path: string | null): Promise<void> {
    await assertOnline();
    const existing = await this.getById(id);
    if (!existing?.companyId) throw new Error('Employee not found');
    await updateDoc(employeeDoc(this.db, existing.companyId, id), {
      profileImagePath: path,
      updatedAt: nowUtcIso(),
    });
  }

  async setFaceEnrollment(
    id: string,
    status: FaceEnrollmentStatus,
    referenceFacePath: string | null,
    embedding?: number[] | null
  ): Promise<void> {
    await assertOnline();
    const existing = await this.getById(id);
    if (!existing?.companyId) throw new Error('Employee not found');
    const now = nowUtcIso();
    await updateDoc(employeeDoc(this.db, existing.companyId, id), {
      faceEnrollmentStatus: status,
      referenceFacePath,
      faceEmbedding: embedding ?? null,
      faceEnrolledAt: status === FaceEnrollmentStatuses.ENROLLED ? now : null,
      deviceEnrolled: status === FaceEnrollmentStatuses.ENROLLED,
      updatedAt: now,
    });
  }

  async setFaceEmbedding(id: string, embedding: number[]): Promise<void> {
    await this.setFaceEnrollment(id, FaceEnrollmentStatuses.ENROLLED, null, embedding);
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await assertOnline();
    const existing = await this.getById(id);
    if (!existing?.companyId) throw new Error('Employee not found');
    await updateDoc(employeeDoc(this.db, existing.companyId, id), {
      isActive,
      updatedAt: nowUtcIso(),
    });
  }

  async deleteAll(): Promise<void> {
    await assertOnline();
    const companyId = await this.requireCompanyId();
    const snap = await getDocs(employeesCol(this.db, companyId));
    const batch = writeBatch(this.db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async listOfficeIds(employeeId: string): Promise<string[]> {
    const employee = await this.getById(employeeId);
    return employee ? ((await this.readOfficeIds(employee)) ?? []) : [];
  }

  private async readOfficeIds(employee: Employee): Promise<string[]> {
    if (!employee.companyId) return [];
    const snap = await getDoc(employeeDoc(this.db, employee.companyId, employee.id));
    if (!snap.exists()) return [];
    return ((snap.data() as EmployeeDoc).officeIds ?? []) as string[];
  }

  async listOffices(employeeId: string): Promise<Office[]> {
    await assertOnline();
    const employee = await this.getById(employeeId);
    if (!employee?.companyId) return [];
    const officeIds = await this.readOfficeIds(employee);
    const offices: Office[] = [];
    for (const officeId of officeIds) {
      const snap = await getDoc(officeDoc(this.db, employee.companyId, officeId));
      if (!snap.exists()) continue;
      const data = snap.data() as {
        companyId: string;
        name: string;
        latitude: number;
        longitude: number;
        radiusMeters: number;
        maxLocationAccuracyMeters: number;
        isActive: boolean;
        address: string | null;
        notes: string | null;
        createdAt: string;
        updatedAt: string;
      };
      if (!data.isActive) continue;
      offices.push({
        id: snap.id,
        companyId: data.companyId,
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusMeters: data.radiusMeters,
        maxLocationAccuracyMeters: data.maxLocationAccuracyMeters,
        isActive: data.isActive,
        address: data.address,
        notes: data.notes,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    }
    return offices.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listByCompanyAndOffice(companyId: string, officeId: string): Promise<Employee[]> {
    await assertOnline();
    const snap = await getDocs(employeesCol(this.db, companyId));
    return snap.docs
      .map((d) => {
        const data = d.data() as EmployeeDoc;
        return { employee: mapEmployee(d.id, data), officeIds: data.officeIds ?? [] };
      })
      .filter((row) => row.employee.isActive && row.officeIds.includes(officeId))
      .map((row) => row.employee)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async setOfficeIds(employeeId: string, officeIds: string[]): Promise<void> {
    await assertOnline();
    const existing = await this.getById(employeeId);
    if (!existing?.companyId) throw new Error('Employee not found');
    const unique = [...new Set(officeIds.filter(Boolean))];
    await updateDoc(employeeDoc(this.db, existing.companyId, employeeId), {
      officeIds: unique,
      updatedAt: nowUtcIso(),
    });
  }
}

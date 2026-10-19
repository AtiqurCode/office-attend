import { parseAuthMethods, type AuthMethod } from '@/constants/auth';
import type { FaceEnrollmentStatus } from '@/constants/status';

export interface Employee {
  id: string;
  companyId: string | null;
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
  deviceEnrolled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeRow {
  id: string;
  company_id: string | null;
  employee_code: string;
  full_name: string;
  department: string | null;
  designation: string | null;
  email: string | null;
  profile_image_path: string | null;
  face_enrollment_status: string;
  reference_face_path: string | null;
  face_embedding: string | null;
  face_enrolled_at: string | null;
  pin_hash: string | null;
  auth_methods: string | null;
  device_enrolled: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function parseEmbedding(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((n): n is number => typeof n === 'number');
  } catch {
    return null;
  }
}

export function mapEmployeeRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    companyId: row.company_id,
    employeeCode: row.employee_code,
    fullName: row.full_name,
    department: row.department,
    designation: row.designation,
    email: row.email,
    profileImagePath: row.profile_image_path,
    faceEnrollmentStatus: row.face_enrollment_status as FaceEnrollmentStatus,
    referenceFacePath: row.reference_face_path,
    faceEmbedding: parseEmbedding(row.face_embedding),
    faceEnrolledAt: row.face_enrolled_at,
    pinHash: row.pin_hash,
    authMethods: row.auth_methods ? parseAuthMethods(row.auth_methods) : null,
    deviceEnrolled: row.device_enrolled === 1,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

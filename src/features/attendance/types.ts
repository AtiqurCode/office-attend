import type { AuthMethod } from '@/constants/auth';
import type {
  AttendanceStatus,
  BiometricGateStatus,
  FaceDetectionStatus,
  FaceVerificationStatus,
  GeofenceStatus,
  SyncStatus,
} from '@/constants/status';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  officeId: string;
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
}

export interface AttendanceRecordRow {
  id: string;
  employee_id: string;
  office_id: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_in_accuracy_meters: number | null;
  check_in_distance_meters: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_accuracy_meters: number | null;
  check_out_distance_meters: number | null;
  face_detection_status: string;
  face_verification_status: string;
  biometric_gate_status: string | null;
  identity_method: string | null;
  geofence_status: string;
  attendance_status: string;
  rejection_reason: string | null;
  sync_status: string;
  location_permission_status: string | null;
  location_validation_message: string | null;
  check_in_location_label: string | null;
  check_out_location_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceWithOffice extends AttendanceRecord {
  officeName: string;
  employeeName?: string;
  employeeCode?: string;
  profileImagePath?: string | null;
}

export interface MonthlySummary {
  recordedDays: number;
  completedPairs: number;
  incompleteRecords: number;
}

export function mapAttendanceRow(row: AttendanceRecordRow): AttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    officeId: row.office_id,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    checkInLatitude: row.check_in_latitude,
    checkInLongitude: row.check_in_longitude,
    checkInAccuracyMeters: row.check_in_accuracy_meters,
    checkInDistanceMeters: row.check_in_distance_meters,
    checkOutLatitude: row.check_out_latitude,
    checkOutLongitude: row.check_out_longitude,
    checkOutAccuracyMeters: row.check_out_accuracy_meters,
    checkOutDistanceMeters: row.check_out_distance_meters,
    faceDetectionStatus: row.face_detection_status as FaceDetectionStatus,
    faceVerificationStatus: row.face_verification_status as FaceVerificationStatus,
    biometricGateStatus: row.biometric_gate_status as BiometricGateStatus | null,
    identityMethod: (row.identity_method as AuthMethod | null) ?? null,
    geofenceStatus: row.geofence_status as GeofenceStatus,
    attendanceStatus: row.attendance_status as AttendanceStatus,
    rejectionReason: row.rejection_reason,
    syncStatus: row.sync_status as SyncStatus,
    locationPermissionStatus: row.location_permission_status,
    locationValidationMessage: row.location_validation_message,
    checkInLocationLabel: row.check_in_location_label ?? null,
    checkOutLocationLabel: row.check_out_location_label ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

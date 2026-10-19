export const FaceEnrollmentStatuses = {
  NOT_ENROLLED: 'not_enrolled',
  ENROLLED: 'enrolled',
  PENDING_REPLACE: 'pending_replace',
} as const;
export type FaceEnrollmentStatus =
  (typeof FaceEnrollmentStatuses)[keyof typeof FaceEnrollmentStatuses];

export const FaceDetectionStatuses = {
  NOT_CHECKED: 'not_checked',
  FACE_DETECTED: 'face_detected',
  NO_FACE: 'no_face',
  UNAVAILABLE: 'unavailable',
} as const;
export type FaceDetectionStatus =
  (typeof FaceDetectionStatuses)[keyof typeof FaceDetectionStatuses];

export const FaceVerificationStatuses = {
  NOT_CHECKED: 'not_checked',
  PENDING_SERVER: 'pending_server_verification',
  UNAVAILABLE: 'unavailable',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;
export type FaceVerificationStatus =
  (typeof FaceVerificationStatuses)[keyof typeof FaceVerificationStatuses];

export const GeofenceStatuses = {
  INSIDE: 'inside',
  OUTSIDE: 'outside',
  ACCURACY_INSUFFICIENT: 'accuracy_insufficient',
  LOCATION_UNAVAILABLE: 'location_unavailable',
  PERMISSION_DENIED: 'permission_denied',
  NOT_CHECKED: 'not_checked',
} as const;
export type GeofenceStatus = (typeof GeofenceStatuses)[keyof typeof GeofenceStatuses];

export const AttendanceStatuses = {
  PENDING_VERIFICATION: 'pending_verification',
  LOCALLY_ACCEPTED: 'locally_accepted',
  REJECTED: 'rejected',
  PENDING_SYNC: 'pending_sync',
  SYNCED: 'synced',
} as const;
export type AttendanceStatus =
  (typeof AttendanceStatuses)[keyof typeof AttendanceStatuses];

export const SyncStatuses = {
  PENDING_SYNC: 'pending_sync',
  SYNCED: 'synced',
  SYNC_FAILED: 'sync_failed',
  NOT_APPLICABLE: 'not_applicable',
} as const;
export type SyncStatus = (typeof SyncStatuses)[keyof typeof SyncStatuses];

export const BiometricGateStatuses = {
  NOT_USED: 'not_used',
  SUCCESS: 'success',
  FAILED: 'failed',
  UNAVAILABLE: 'unavailable',
  CANCELLED: 'cancelled',
} as const;
export type BiometricGateStatus =
  (typeof BiometricGateStatuses)[keyof typeof BiometricGateStatuses];

export const EvidenceRetentionStatuses = {
  RETAINED: 'retained',
  PENDING_DELETE: 'pending_delete',
  DELETED: 'deleted',
} as const;
export type EvidenceRetentionStatus =
  (typeof EvidenceRetentionStatuses)[keyof typeof EvidenceRetentionStatuses];

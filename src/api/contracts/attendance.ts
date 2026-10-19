/**
 * Stable DTO shapes for a future REST attendance API.
 * Not used for network calls in V1.
 */

export interface AttendanceAttemptDto {
  clientAttendanceId: string;
  employeeId: string;
  officeId: string;
  action: 'check_in' | 'check_out';
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  distanceMeters: number | null;
  faceDetectionStatus: string;
  faceVerificationStatus: string;
  geofenceStatus: string;
  biometricGateStatus: string | null;
  deviceTimezoneOffsetMinutes: number;
}

export interface ServerAttendanceResultDto {
  clientAttendanceId: string;
  serverAttendanceId: string;
  attendanceStatus: string;
  faceVerificationStatus: string;
  geofenceStatus: string;
  rejectionReason: string | null;
  verifiedAt: string;
}

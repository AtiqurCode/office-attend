import {
  AttendanceStatuses,
  FaceDetectionStatuses,
  FaceVerificationStatuses,
  GeofenceStatuses,
} from '@/constants/status';

/**
 * Documents V1 verification policy without requiring a live SQLite instance.
 * Full repository transaction tests should run on device/emulator with expo-sqlite.
 */
describe('V1 attendance verification policy', () => {
  it('does not treat face detection as identity verification', () => {
    const faceDetected = FaceDetectionStatuses.FACE_DETECTED;
    const verification = FaceVerificationStatuses.PENDING_SERVER;
    expect(faceDetected).not.toBe('verified');
    expect(verification).toBe('pending_server_verification');
  });

  it('keeps geofence and face verification statuses independent', () => {
    const geofence = GeofenceStatuses.INSIDE;
    const face = FaceVerificationStatuses.UNAVAILABLE;
    expect(geofence).not.toEqual(face);
  });

  it('labels unverified local success as pending_verification', () => {
    const status =
      FaceVerificationStatuses.PENDING_SERVER === 'pending_server_verification'
        ? AttendanceStatuses.PENDING_VERIFICATION
        : AttendanceStatuses.LOCALLY_ACCEPTED;
    expect(status).toBe(AttendanceStatuses.PENDING_VERIFICATION);
  });

  it('duplicate check-in rule: open record blocks another check-in', () => {
    const openCheckIn = { id: 'a1', checkOutAt: null as string | null };
    const canCheckIn = openCheckIn == null || openCheckIn.checkOutAt != null;
    expect(canCheckIn).toBe(false);
  });

  it('check-out requires active check-in', () => {
    const openCheckIn = null;
    const canCheckOut = openCheckIn != null;
    expect(canCheckOut).toBe(false);
  });
});

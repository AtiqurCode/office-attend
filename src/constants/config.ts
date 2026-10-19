/**
 * Demo office uses a clearly non-production coordinate near Null Island.
 * Replace via Settings → Administrator mode with your real office location.
 */
export const DEMO_OFFICE = {
  id: 'demo-office-001',
  name: 'Demo Office (Not a real company location)',
  latitude: 0.0,
  longitude: 0.0,
  radiusMeters: 200,
  maxLocationAccuracyMeters: 50,
  address: 'Demonstration coordinates — configure a real office before production use',
  notes: 'Seeded for development only. Client-side geofencing is best-effort.',
} as const;

export const DEFAULT_SETTINGS = {
  gpsAccuracyThresholdMeters: 50,
  requireBiometricGate: false,
  retainAttendanceSelfies: true,
  retainReferenceSelfie: true,
  adminModeEnabled: false,
} as const;

/** Display name (spaces OK in UI). */
export const APP_NAME = 'Office Attend';
/** Compact / product id style (no space). */
export const APP_NAME_COMPACT = 'OfficeAttend';
export const DATABASE_NAME = 'attendance.db';
export const DATABASE_VERSION = 3;

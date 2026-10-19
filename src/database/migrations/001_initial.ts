import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrate001Initial(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY NOT NULL,
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT,
  designation TEXT,
  email TEXT,
  profile_image_path TEXT,
  face_enrollment_status TEXT NOT NULL,
  reference_face_path TEXT,
  device_enrolled INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offices (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_meters INTEGER NOT NULL,
  max_location_accuracy_meters INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  address TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY NOT NULL,
  employee_id TEXT NOT NULL,
  office_id TEXT NOT NULL,
  check_in_at TEXT,
  check_out_at TEXT,
  check_in_latitude REAL,
  check_in_longitude REAL,
  check_in_accuracy_meters REAL,
  check_in_distance_meters REAL,
  check_out_latitude REAL,
  check_out_longitude REAL,
  check_out_accuracy_meters REAL,
  check_out_distance_meters REAL,
  face_detection_status TEXT NOT NULL,
  face_verification_status TEXT NOT NULL,
  biometric_gate_status TEXT,
  geofence_status TEXT NOT NULL,
  attendance_status TEXT NOT NULL,
  rejection_reason TEXT,
  sync_status TEXT NOT NULL,
  location_permission_status TEXT,
  location_validation_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (office_id) REFERENCES offices(id)
);

CREATE TABLE IF NOT EXISTS attendance_evidence (
  id TEXT PRIMARY KEY NOT NULL,
  attendance_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  local_file_path TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  retention_status TEXT NOT NULL,
  FOREIGN KEY (attendance_id) REFERENCES attendance_records(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_office ON attendance_records(office_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance_records(check_in_at);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(attendance_status);
CREATE INDEX IF NOT EXISTS idx_attendance_sync ON attendance_records(sync_status);
CREATE INDEX IF NOT EXISTS idx_evidence_attendance ON attendance_evidence(attendance_id);
`);
}

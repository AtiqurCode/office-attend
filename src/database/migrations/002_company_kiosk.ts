import type { SQLiteDatabase } from 'expo-sqlite';

async function columnExists(
  db: SQLiteDatabase,
  table: string,
  column: string
): Promise<boolean> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

async function addColumnIfMissing(
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  if (await columnExists(db, table, column)) return;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
}

/**
 * Additive migration — never DROP parent tables while FKs exist.
 * Safe to re-run column checks for repair.
 */
export async function migrate002CompanyKiosk(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  logo_path TEXT,
  enabled_auth_methods TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

  // Drop leftover failed-migration tables if present
  await db.execAsync(`
DROP TABLE IF EXISTS employees_new;
DROP TABLE IF EXISTS offices_new;
DROP TABLE IF EXISTS attendance_records_new;
`);

  await addColumnIfMissing(db, 'employees', 'company_id', 'TEXT');
  await addColumnIfMissing(db, 'employees', 'face_embedding', 'TEXT');
  await addColumnIfMissing(db, 'employees', 'face_enrolled_at', 'TEXT');
  await addColumnIfMissing(db, 'employees', 'pin_hash', 'TEXT');
  await addColumnIfMissing(db, 'employees', 'auth_methods', 'TEXT');

  await addColumnIfMissing(db, 'offices', 'company_id', 'TEXT');

  await addColumnIfMissing(db, 'attendance_records', 'identity_method', 'TEXT');
  await addColumnIfMissing(db, 'attendance_records', 'check_in_location_label', 'TEXT');
  await addColumnIfMissing(db, 'attendance_records', 'check_out_location_label', 'TEXT');

  await db.execAsync(`
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_offices_company ON offices(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_check_in ON attendance_records(employee_id, check_in_at);
`);
}

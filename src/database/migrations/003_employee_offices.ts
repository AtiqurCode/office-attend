import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Many-to-many: employees can punch at one or more company locations.
 */
export async function migrate003EmployeeOffices(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
CREATE TABLE IF NOT EXISTS employee_offices (
  employee_id TEXT NOT NULL,
  office_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (employee_id, office_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_employee_offices_office ON employee_offices(office_id);
CREATE INDEX IF NOT EXISTS idx_employee_offices_employee ON employee_offices(employee_id);
`);

  // Backfill: every active employee gets every active office in their company
  // (safe default so existing installs keep working until admins tighten access).
  await db.execAsync(`
INSERT OR IGNORE INTO employee_offices (employee_id, office_id, created_at)
SELECT e.id, o.id, datetime('now')
FROM employees e
JOIN offices o ON o.company_id = e.company_id AND o.is_active = 1
WHERE e.is_active = 1 AND e.company_id IS NOT NULL;
`);
}

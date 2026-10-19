import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION } from '@/constants/config';
import { migrate001Initial } from '@/database/migrations/001_initial';
import { migrate002CompanyKiosk } from '@/database/migrations/002_company_kiosk';
import { migrate003EmployeeOffices } from '@/database/migrations/003_employee_offices';
import { seedDemoDataIfNeeded } from '@/database/seed';

/**
 * Ensures kiosk columns exist even if a previous broken migration
 * advanced user_version without applying schema changes.
 */
async function repairKioskSchema(db: SQLiteDatabase): Promise<void> {
  await migrate002CompanyKiosk(db);
  await migrate003EmployeeOffices(db);
}

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = result?.user_version ?? 0;

  if (current === 0) {
    await migrate001Initial(db);
    current = 1;
  }

  if (current === 1) {
    await migrate002CompanyKiosk(db);
    current = 2;
  }

  if (current === 2) {
    await migrate003EmployeeOffices(db);
    current = 3;
  }

  // Always repair additive schema (idempotent).
  await repairKioskSchema(db);

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  await seedDemoDataIfNeeded(db);
}

import type { SQLiteDatabase } from 'expo-sqlite';

import { serializeAuthMethods, AuthMethods } from '@/constants/auth';
import { DEMO_OFFICE } from '@/constants/config';
import { nowUtcIso } from '@/utils/datetime';

export const DEMO_COMPANY_ID = 'demo-company-001';

export async function seedDemoDataIfNeeded(db: SQLiteDatabase): Promise<void> {
  const now = nowUtcIso();

  const company = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM companies WHERE id = ?',
    DEMO_COMPANY_ID
  );
  if (!company) {
    await db.runAsync(
      `INSERT INTO companies (id, name, logo_path, enabled_auth_methods, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?)`,
      DEMO_COMPANY_ID,
      'Demo Company',
      serializeAuthMethods([AuthMethods.PIN, AuthMethods.FACE]),
      now,
      now
    );
  }

  const office = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM offices WHERE id = ?',
    DEMO_OFFICE.id
  );
  if (!office) {
    await db.runAsync(
      `INSERT INTO offices (
        id, company_id, name, latitude, longitude, radius_meters, max_location_accuracy_meters,
        is_active, address, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      DEMO_OFFICE.id,
      DEMO_COMPANY_ID,
      DEMO_OFFICE.name,
      DEMO_OFFICE.latitude,
      DEMO_OFFICE.longitude,
      DEMO_OFFICE.radiusMeters,
      DEMO_OFFICE.maxLocationAccuracyMeters,
      DEMO_OFFICE.address,
      DEMO_OFFICE.notes,
      now,
      now
    );
  } else {
    await db.runAsync(
      `UPDATE offices SET company_id = COALESCE(company_id, ?) WHERE id = ?`,
      DEMO_COMPANY_ID,
      DEMO_OFFICE.id
    );
  }

  // Attach orphan employees/offices to demo company after migration
  await db.runAsync(
    `UPDATE employees SET company_id = ? WHERE company_id IS NULL`,
    DEMO_COMPANY_ID
  );
  await db.runAsync(
    `UPDATE offices SET company_id = ? WHERE company_id IS NULL`,
    DEMO_COMPANY_ID
  );
}

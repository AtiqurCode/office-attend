import type { SQLiteDatabase } from 'expo-sqlite';

import type { OfficeInput } from '@/features/offices/schemas/officeSchema';
import { mapOfficeRow, type Office, type OfficeRow } from '@/features/offices/types';
import { nowUtcIso } from '@/utils/datetime';
import { createId } from '@/utils/uuid';

export class OfficeRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listByCompany(companyId: string): Promise<Office[]> {
    const rows = await this.db.getAllAsync<OfficeRow>(
      `SELECT * FROM offices WHERE company_id = ? AND is_active = 1 ORDER BY name ASC`,
      companyId
    );
    return rows.map(mapOfficeRow);
  }

  async listActive(): Promise<Office[]> {
    const rows = await this.db.getAllAsync<OfficeRow>(
      'SELECT * FROM offices WHERE is_active = 1 ORDER BY name ASC'
    );
    return rows.map(mapOfficeRow);
  }

  async listAll(): Promise<Office[]> {
    const rows = await this.db.getAllAsync<OfficeRow>(
      'SELECT * FROM offices ORDER BY name ASC'
    );
    return rows.map(mapOfficeRow);
  }

  async getById(id: string): Promise<Office | null> {
    const row = await this.db.getFirstAsync<OfficeRow>(
      'SELECT * FROM offices WHERE id = ?',
      id
    );
    return row ? mapOfficeRow(row) : null;
  }

  async getDefault(companyId?: string | null): Promise<Office | null> {
    if (companyId) {
      const row = await this.db.getFirstAsync<OfficeRow>(
        `SELECT * FROM offices WHERE is_active = 1 AND company_id = ?
         ORDER BY created_at ASC LIMIT 1`,
        companyId
      );
      return row ? mapOfficeRow(row) : null;
    }
    const row = await this.db.getFirstAsync<OfficeRow>(
      'SELECT * FROM offices WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1'
    );
    return row ? mapOfficeRow(row) : null;
  }

  async create(input: OfficeInput & { companyId: string }): Promise<Office> {
    const id = createId();
    const now = nowUtcIso();
    await this.db.runAsync(
      `INSERT INTO offices (
        id, company_id, name, latitude, longitude, radius_meters, max_location_accuracy_meters,
        is_active, address, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.companyId,
      input.name.trim(),
      input.latitude,
      input.longitude,
      input.radiusMeters,
      input.maxLocationAccuracyMeters,
      input.isActive ? 1 : 0,
      input.address?.trim() || null,
      input.notes?.trim() || null,
      now,
      now
    );
    const created = await this.getById(id);
    if (!created) throw new Error('Failed to create office');
    return created;
  }

  async update(id: string, input: OfficeInput): Promise<Office> {
    const now = nowUtcIso();
    await this.db.runAsync(
      `UPDATE offices SET
        name = ?, latitude = ?, longitude = ?, radius_meters = ?,
        max_location_accuracy_meters = ?, is_active = ?, address = ?,
        notes = ?, updated_at = ?
      WHERE id = ?`,
      input.name.trim(),
      input.latitude,
      input.longitude,
      input.radiusMeters,
      input.maxLocationAccuracyMeters,
      input.isActive ? 1 : 0,
      input.address?.trim() || null,
      input.notes?.trim() || null,
      now,
      id
    );
    const updated = await this.getById(id);
    if (!updated) throw new Error('Office not found');
    return updated;
  }
}

import type { SQLiteDatabase } from 'expo-sqlite';

import { serializeAuthMethods, type AuthMethod } from '@/constants/auth';
import {
  mapCompanyRow,
  type Company,
  type CompanyRow,
} from '@/features/companies/types';
import { nowUtcIso } from '@/utils/datetime';
import { createId } from '@/utils/uuid';

export class CompanyRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getPrimary(): Promise<Company | null> {
    const row = await this.db.getFirstAsync<CompanyRow>(
      'SELECT * FROM companies ORDER BY created_at ASC LIMIT 1'
    );
    return row ? mapCompanyRow(row) : null;
  }

  async getById(id: string): Promise<Company | null> {
    const row = await this.db.getFirstAsync<CompanyRow>(
      'SELECT * FROM companies WHERE id = ?',
      id
    );
    return row ? mapCompanyRow(row) : null;
  }

  async create(input: {
    name: string;
    enabledAuthMethods: AuthMethod[];
    logoPath?: string | null;
    ownerUid?: string | null;
    ownerEmail?: string | null;
    ownerDisplayName?: string | null;
  }): Promise<Company> {
    const id = createId();
    const now = nowUtcIso();
    await this.db.runAsync(
      `INSERT INTO companies (id, name, logo_path, enabled_auth_methods, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      input.name.trim(),
      input.logoPath ?? null,
      serializeAuthMethods(input.enabledAuthMethods),
      now,
      now
    );
    const created = await this.getById(id);
    if (!created) throw new Error('Failed to create company');
    return created;
  }

  async update(
    id: string,
    input: Partial<{
      name: string;
      enabledAuthMethods: AuthMethod[];
      logoPath: string | null;
    }>
  ): Promise<Company> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Company not found');
    const now = nowUtcIso();
    await this.db.runAsync(
      `UPDATE companies SET name = ?, logo_path = ?, enabled_auth_methods = ?, updated_at = ?
       WHERE id = ?`,
      input.name?.trim() ?? existing.name,
      input.logoPath !== undefined ? input.logoPath : existing.logoPath,
      serializeAuthMethods(input.enabledAuthMethods ?? existing.enabledAuthMethods),
      now,
      id
    );
    const updated = await this.getById(id);
    if (!updated) throw new Error('Company not found');
    return updated;
  }
}

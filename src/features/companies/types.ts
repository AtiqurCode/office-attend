import { parseAuthMethods, type AuthMethod } from '@/constants/auth';

export interface Company {
  id: string;
  name: string;
  logoPath: string | null;
  enabledAuthMethods: AuthMethod[];
  /** Firebase Auth uid of the account that owns this company (cloud mode). */
  ownerUid?: string | null;
  ownerEmail?: string | null;
  ownerDisplayName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyRow {
  id: string;
  name: string;
  logo_path: string | null;
  enabled_auth_methods: string;
  created_at: string;
  updated_at: string;
}

export function mapCompanyRow(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    logoPath: row.logo_path,
    enabledAuthMethods: parseAuthMethods(row.enabled_auth_methods),
    ownerUid: null,
    ownerEmail: null,
    ownerDisplayName: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

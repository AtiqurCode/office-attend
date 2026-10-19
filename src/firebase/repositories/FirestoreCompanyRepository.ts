import {
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import type { AuthMethod } from '@/constants/auth';
import type { Company } from '@/features/companies/types';
import { getBoundCompanyId, setBoundCompanyId } from '@/firebase/deviceBinding';
import { assertOnline } from '@/firebase/online';
import { companiesCol, companyDoc } from '@/firebase/paths';
import { getFirestoreDb, getFirebaseAuth } from '@/firebase/config';
import { nowUtcIso } from '@/utils/datetime';
import { createId } from '@/utils/uuid';

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: string }).code) : '';
  const message = error instanceof Error ? error.message : '';
  return (
    code.includes('permission-denied') ||
    message.toLowerCase().includes('missing or insufficient permissions')
  );
}

type CompanyDoc = {
  name: string;
  logoPath: string | null;
  enabledAuthMethods: AuthMethod[];
  ownerUid: string | null;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapCompany(id: string, data: CompanyDoc): Company {
  return {
    id,
    name: data.name,
    logoPath: data.logoPath ?? null,
    enabledAuthMethods: data.enabledAuthMethods ?? [],
    ownerUid: data.ownerUid ?? null,
    ownerEmail: data.ownerEmail ?? null,
    ownerDisplayName: data.ownerDisplayName ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export class FirestoreCompanyRepository {
  private db = getFirestoreDb();

  async getPrimary(): Promise<Company | null> {
    await assertOnline();
    try {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (uid) {
        const owned = await this.getByOwnerUid(uid);
        if (owned) {
          await setBoundCompanyId(owned.id);
          return owned;
        }
      }
      const bound = await getBoundCompanyId();
      if (bound) {
        const company = await this.getById(bound);
        if (company && (!uid || !company.ownerUid || company.ownerUid === uid)) {
          return company;
        }
      }
      return null;
    } catch (e) {
      // Stale session / rules not published yet — let UI reach auth instead of crash.
      if (isPermissionDenied(e)) return null;
      throw e;
    }
  }

  async getByOwnerUid(ownerUid: string): Promise<Company | null> {
    await assertOnline();
    try {
      const snap = await getDocs(
        query(companiesCol(this.db), where('ownerUid', '==', ownerUid))
      );
      const first = snap.docs[0];
      return first ? mapCompany(first.id, first.data() as CompanyDoc) : null;
    } catch (e) {
      if (isPermissionDenied(e)) return null;
      throw e;
    }
  }

  async getById(id: string): Promise<Company | null> {
    await assertOnline();
    try {
      const snap = await getDoc(companyDoc(this.db, id));
      if (!snap.exists()) return null;
      return mapCompany(snap.id, snap.data() as CompanyDoc);
    } catch (e) {
      if (isPermissionDenied(e)) return null;
      throw e;
    }
  }

  async create(input: {
    name: string;
    enabledAuthMethods: AuthMethod[];
    logoPath?: string | null;
    ownerUid?: string | null;
    ownerEmail?: string | null;
    ownerDisplayName?: string | null;
  }): Promise<Company> {
    await assertOnline();
    const id = createId();
    const now = nowUtcIso();
    const data: CompanyDoc = {
      name: input.name.trim(),
      logoPath: input.logoPath ?? null,
      enabledAuthMethods: input.enabledAuthMethods,
      ownerUid: input.ownerUid ?? getFirebaseAuth().currentUser?.uid ?? null,
      ownerEmail: input.ownerEmail ?? getFirebaseAuth().currentUser?.email ?? null,
      ownerDisplayName:
        input.ownerDisplayName ?? getFirebaseAuth().currentUser?.displayName ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(companyDoc(this.db, id), data);
    await setBoundCompanyId(id);
    return mapCompany(id, data);
  }

  async update(
    id: string,
    input: Partial<{
      name: string;
      enabledAuthMethods: AuthMethod[];
      logoPath: string | null;
    }>
  ): Promise<Company> {
    await assertOnline();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Company not found');
    const now = nowUtcIso();
    const patch = {
      name: input.name?.trim() ?? existing.name,
      logoPath: input.logoPath !== undefined ? input.logoPath : existing.logoPath,
      enabledAuthMethods: input.enabledAuthMethods ?? existing.enabledAuthMethods,
      updatedAt: now,
    };
    await updateDoc(companyDoc(this.db, id), patch);
    await setBoundCompanyId(id);
    return { ...existing, ...patch };
  }
}

import { getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';

import type { OfficeInput } from '@/features/offices/schemas/officeSchema';
import type { Office } from '@/features/offices/types';
import { getBoundCompanyId } from '@/firebase/deviceBinding';
import { getFirestoreDb } from '@/firebase/config';
import { assertOnline } from '@/firebase/online';
import { officeDoc, officesCol } from '@/firebase/paths';
import { nowUtcIso } from '@/utils/datetime';
import { createId } from '@/utils/uuid';

type OfficeDoc = {
  companyId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxLocationAccuracyMeters: number;
  isActive: boolean;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapOffice(id: string, data: OfficeDoc): Office {
  return {
    id,
    companyId: data.companyId,
    name: data.name,
    latitude: data.latitude,
    longitude: data.longitude,
    radiusMeters: data.radiusMeters,
    maxLocationAccuracyMeters: data.maxLocationAccuracyMeters,
    isActive: data.isActive,
    address: data.address,
    notes: data.notes,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export class FirestoreOfficeRepository {
  private get db() {
    return getFirestoreDb();
  }

  private async requireCompanyId(companyId?: string | null): Promise<string> {
    const id = companyId || (await getBoundCompanyId());
    if (!id) throw new Error('No company bound. Complete setup first.');
    return id;
  }

  async listByCompany(companyId: string): Promise<Office[]> {
    await assertOnline();
    const snap = await getDocs(officesCol(this.db, companyId));
    return snap.docs
      .map((d) => mapOffice(d.id, d.data() as OfficeDoc))
      .filter((o) => o.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async listActive(): Promise<Office[]> {
    const companyId = await this.requireCompanyId();
    return this.listByCompany(companyId);
  }

  async listAll(): Promise<Office[]> {
    await assertOnline();
    const companyId = await this.requireCompanyId();
    const snap = await getDocs(
      query(officesCol(this.db, companyId), orderBy('name', 'asc'))
    );
    return snap.docs.map((d) => mapOffice(d.id, d.data() as OfficeDoc));
  }

  async getById(id: string): Promise<Office | null> {
    await assertOnline();
    const companyId = await this.requireCompanyId();
    const snap = await getDoc(officeDoc(this.db, companyId, id));
    if (!snap.exists()) return null;
    return mapOffice(snap.id, snap.data() as OfficeDoc);
  }

  async getDefault(companyId?: string | null): Promise<Office | null> {
    const cid = companyId || (await getBoundCompanyId());
    if (!cid) return null;
    const list = await this.listByCompany(cid);
    return (
      [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ?? null
    );
  }

  async create(input: OfficeInput & { companyId: string }): Promise<Office> {
    await assertOnline();
    const id = createId();
    const now = nowUtcIso();
    const data: OfficeDoc = {
      companyId: input.companyId,
      name: input.name.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters,
      maxLocationAccuracyMeters: input.maxLocationAccuracyMeters,
      isActive: input.isActive,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(officeDoc(this.db, input.companyId, id), data);
    return mapOffice(id, data);
  }

  async update(id: string, input: OfficeInput): Promise<Office> {
    await assertOnline();
    const existing = await this.getById(id);
    if (!existing?.companyId) throw new Error('Office not found');
    const now = nowUtcIso();
    const data: OfficeDoc = {
      companyId: existing.companyId,
      name: input.name.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters,
      maxLocationAccuracyMeters: input.maxLocationAccuracyMeters,
      isActive: input.isActive,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    await setDoc(officeDoc(this.db, existing.companyId, id), data);
    return mapOffice(id, data);
  }
}

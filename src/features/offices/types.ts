export interface Office {
  id: string;
  companyId: string | null;
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
}

export interface OfficeRow {
  id: string;
  company_id: string | null;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  max_location_accuracy_meters: number;
  is_active: number;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function mapOfficeRow(row: OfficeRow): Office {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusMeters: row.radius_meters,
    maxLocationAccuracyMeters: row.max_location_accuracy_meters,
    isActive: row.is_active === 1,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

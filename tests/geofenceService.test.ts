import { GeofenceStatuses } from '@/constants/status';
import type { Office } from '@/features/offices/types';
import { HaversineGeofenceService } from '@/services/location/GeofenceService';
import type { DeviceLocation } from '@/services/location/LocationService';

const office: Office = {
  id: 'o1',
  companyId: 'c1',
  name: 'Test Office',
  latitude: 0,
  longitude: 0,
  radiusMeters: 200,
  maxLocationAccuracyMeters: 50,
  isActive: true,
  address: null,
  notes: null,
  createdAt: '',
  updatedAt: '',
};

function loc(partial: Partial<DeviceLocation>): DeviceLocation {
  return {
    latitude: 0,
    longitude: 0,
    accuracyMeters: 10,
    timestamp: new Date().toISOString(),
    permissionStatus: 'granted' as DeviceLocation['permissionStatus'],
    ...partial,
  };
}

describe('HaversineGeofenceService', () => {
  const service = new HaversineGeofenceService();

  it('accepts inside accurate location', () => {
    const result = service.validate(loc({ latitude: 0.0005, longitude: 0 }), office);
    expect(result.accepted).toBe(true);
    expect(result.geofenceStatus).toBe(GeofenceStatuses.INSIDE);
  });

  it('rejects outside radius', () => {
    const result = service.validate(loc({ latitude: 0.01, longitude: 0 }), office);
    expect(result.accepted).toBe(false);
    expect(result.geofenceStatus).toBe(GeofenceStatuses.OUTSIDE);
  });

  it('rejects poor accuracy', () => {
    const result = service.validate(loc({ accuracyMeters: 120 }), office);
    expect(result.accepted).toBe(false);
    expect(result.geofenceStatus).toBe(GeofenceStatuses.ACCURACY_INSUFFICIENT);
  });
});

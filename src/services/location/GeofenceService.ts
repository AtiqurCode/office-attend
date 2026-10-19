import type { Office } from '@/features/offices/types';
import {
  haversineDistanceMeters,
  isAccuracySufficient,
  isWithinGeofence,
} from '@/utils/geo';
import { GeofenceStatuses, type GeofenceStatus } from '@/constants/status';
import type { DeviceLocation } from '@/services/location/LocationService';

export interface GeofenceValidationResult {
  distanceMeters: number;
  geofenceStatus: GeofenceStatus;
  validationMessage: string;
  accepted: boolean;
}

export interface GeofenceService {
  validate(location: DeviceLocation, office: Office): GeofenceValidationResult;
}

export class HaversineGeofenceService implements GeofenceService {
  validate(location: DeviceLocation, office: Office): GeofenceValidationResult {
    const distanceMeters = haversineDistanceMeters(
      location.latitude,
      location.longitude,
      office.latitude,
      office.longitude
    );

    if (!isAccuracySufficient(location.accuracyMeters, office.maxLocationAccuracyMeters)) {
      return {
        distanceMeters,
        geofenceStatus: GeofenceStatuses.ACCURACY_INSUFFICIENT,
        validationMessage: `GPS accuracy ${location.accuracyMeters?.toFixed(0) ?? '?'} m exceeds the allowed ${office.maxLocationAccuracyMeters} m. Move outdoors or retry.`,
        accepted: false,
      };
    }

    if (!isWithinGeofence(distanceMeters, office.radiusMeters)) {
      return {
        distanceMeters,
        geofenceStatus: GeofenceStatuses.OUTSIDE,
        validationMessage: `You are ${Math.round(distanceMeters)} m from ${office.name}. Allowed radius is ${office.radiusMeters} m. Local geofence checks are best-effort only.`,
        accepted: false,
      };
    }

    return {
      distanceMeters,
      geofenceStatus: GeofenceStatuses.INSIDE,
      validationMessage: `Inside office geofence (${Math.round(distanceMeters)} m from center). Best-effort local validation only.`,
      accepted: true,
    };
  }
}

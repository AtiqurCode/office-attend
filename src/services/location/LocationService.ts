import * as Location from 'expo-location';

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  timestamp: string;
  permissionStatus: Location.PermissionStatus;
}

export interface LocationService {
  requestForegroundPermission(): Promise<Location.PermissionStatus>;
  getCurrentPosition(): Promise<DeviceLocation>;
}

export class ExpoLocationService implements LocationService {
  async requestForegroundPermission(): Promise<Location.PermissionStatus> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status;
  }

  async getCurrentPosition(): Promise<DeviceLocation> {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      const requested = await this.requestForegroundPermission();
      if (requested !== Location.PermissionStatus.GRANTED) {
        throw new LocationPermissionError(requested);
      }
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: position.coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString(),
      permissionStatus: Location.PermissionStatus.GRANTED,
    };
  }
}

export class LocationPermissionError extends Error {
  constructor(public readonly status: Location.PermissionStatus) {
    super('Location permission denied');
    this.name = 'LocationPermissionError';
  }
}

export class LocationUnavailableError extends Error {
  constructor(message = 'Unable to acquire GPS location') {
    super(message);
    this.name = 'LocationUnavailableError';
  }
}

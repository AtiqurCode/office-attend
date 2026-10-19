import {
  formatDistance,
  haversineDistanceMeters,
  isAccuracySufficient,
  isWithinGeofence,
} from '@/utils/geo';

describe('haversineDistanceMeters', () => {
  it('returns ~0 for identical coordinates', () => {
    expect(haversineDistanceMeters(23.81, 90.41, 23.81, 90.41)).toBeLessThan(0.01);
  });

  it('computes known short distance approximately', () => {
    // ~111.2 km per degree latitude
    const meters = haversineDistanceMeters(0, 0, 1, 0);
    expect(meters).toBeGreaterThan(110_000);
    expect(meters).toBeLessThan(112_500);
  });
});

describe('geofence and accuracy', () => {
  it('accepts points inside radius', () => {
    expect(isWithinGeofence(150, 200)).toBe(true);
    expect(isWithinGeofence(201, 200)).toBe(false);
  });

  it('rejects insufficient GPS accuracy', () => {
    expect(isAccuracySufficient(30, 50)).toBe(true);
    expect(isAccuracySufficient(80, 50)).toBe(false);
    expect(isAccuracySufficient(null, 50)).toBe(false);
  });

  it('formats distances', () => {
    expect(formatDistance(420)).toBe('420 m');
    expect(formatDistance(2500)).toBe('2.50 km');
    expect(formatDistance(null)).toBe('—');
  });
});

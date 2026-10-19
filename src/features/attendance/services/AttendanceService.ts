import type { AuthMethod } from '@/constants/auth';
import { AuthMethods } from '@/constants/auth';
import {
  AttendanceStatuses,
  BiometricGateStatuses,
  EvidenceRetentionStatuses,
  FaceDetectionStatuses,
  FaceVerificationStatuses,
  GeofenceStatuses,
  SyncStatuses,
  type BiometricGateStatus,
  type FaceDetectionStatus,
  type FaceVerificationStatus,
  type GeofenceStatus,
} from '@/constants/status';
import type { CreateAttendanceInput } from '@/features/attendance/repositories/AttendanceRepository';
import type {
  AttendanceRecord,
  AttendanceWithOffice,
  MonthlySummary,
} from '@/features/attendance/types';
import type { Employee } from '@/features/employees/types';
import type { Office } from '@/features/offices/types';
import type { AppSettings } from '@/features/settings/repositories/SettingsRepository';
import { OfflineError, assertOnline } from '@/firebase/online';
import { uploadAttendancePhoto } from '@/firebase/storage';
import { isFirebaseConfigured, isFirebaseStorageEnabled } from '@/firebase/config';
import type { PinAuthProvider } from '@/services/auth/PinAuthProvider';
import type { ImageStorageService } from '@/services/camera/ImageStorageService';
import type {
  EyeLivenessProvider,
  FaceDetectionService,
  FaceVerificationProvider,
} from '@/services/face-verification/types';
import type {
  GeofenceService,
  GeofenceValidationResult,
} from '@/services/location/GeofenceService';
import {
  LocationPermissionError,
  type DeviceLocation,
  type LocationService,
} from '@/services/location/LocationService';
import { nowUtcIso } from '@/utils/datetime';
import { createId } from '@/utils/uuid';

/** Minimal surface AttendanceService needs from attendance/employee repos. */
export interface AttendanceStore {
  getById(id: string): Promise<AttendanceRecord | null>;
  getOpenCheckIn(employeeId: string): Promise<AttendanceRecord | null>;
  create(input: CreateAttendanceInput): Promise<AttendanceRecord>;
  updateCheckout(
    id: string,
    patch: Partial<AttendanceRecord>
  ): Promise<AttendanceRecord>;
  insertEvidence(input: {
    id: string;
    attendanceId: string;
    evidenceType: string;
    localFilePath: string;
    capturedAt: string;
    retentionStatus: string;
  }): Promise<void>;
  listEvidence(attendanceId: string): Promise<
    {
      id: string;
      attendanceId: string;
      evidenceType: string;
      localFilePath: string;
      capturedAt: string;
      retentionStatus: string;
    }[]
  >;
  listForEmployee(
    employeeId: string,
    startUtc?: string,
    endUtc?: string
  ): Promise<AttendanceWithOffice[]>;
  listForCompanyInRange(
    companyId: string,
    startUtc: string,
    endUtc: string
  ): Promise<AttendanceWithOffice[]>;
  getMonthlySummary(
    employeeId: string,
    startUtc: string,
    endUtc: string
  ): Promise<MonthlySummary>;
}

export interface EmployeeStore {
  getById(id: string): Promise<Employee | null>;
  listOffices(employeeId: string): Promise<Office[]>;
}

export type AttendanceAction = 'check_in' | 'check_out';
/** Resolve in/out from open session — no third-person approval. */
export type AttendanceActionInput = AttendanceAction | 'auto';

export interface AttendanceAttemptInput {
  action: AttendanceActionInput;
  employeeId: string;
  identityMethod: AuthMethod;
  pin?: string;
  selfieUri: string | null;
  eyeSampleUris?: string[];
  settings: AppSettings;
}

export interface AttendanceAttemptResult {
  ok: boolean;
  record: AttendanceRecord | null;
  employeeName: string | null;
  title: string;
  message: string;
  identityMethod: AuthMethod;
  faceDetectionStatus: FaceDetectionStatus;
  faceVerificationStatus: FaceVerificationStatus;
  geofenceStatus: GeofenceStatus;
  biometricGateStatus: BiometricGateStatus;
  distanceMeters: number | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
}

function locationLabel(lat: number, lng: number, accuracy: number | null): string {
  const acc = accuracy != null ? ` ±${Math.round(accuracy)}m` : '';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}${acc}`;
}

export class AttendanceService {
  constructor(
    private readonly attendanceRepo: AttendanceStore,
    private readonly employeeRepo: EmployeeStore,
    private readonly locationService: LocationService,
    private readonly geofenceService: GeofenceService,
    /** Kept for re-enabling face match later. */
    private readonly _faceDetection: FaceDetectionService,
    /** Kept for re-enabling face match later. */
    private readonly _faceVerification: FaceVerificationProvider,
    /** Kept for re-enabling eye liveness later. */
    private readonly _eyeLiveness: EyeLivenessProvider,
    private readonly pinAuth: PinAuthProvider,
    private readonly images: ImageStorageService
  ) {}

  async attempt(input: AttendanceAttemptInput): Promise<AttendanceAttemptResult> {
    if (isFirebaseConfigured()) {
      try {
        await assertOnline();
      } catch (e) {
        const message =
          e instanceof OfflineError
            ? e.message
            : 'Internet required to punch. Connect and try again.';
        return fail(input.identityMethod, 'Offline', message);
      }
    }

    const employee = await this.employeeRepo.getById(input.employeeId);
    if (!employee || !employee.isActive) {
      return fail(input.identityMethod, 'Employee not found', 'Select a valid employee.');
    }

    const assignedOffices = await this.employeeRepo.listOffices(employee.id);
    if (assignedOffices.length === 0) {
      return fail(
        input.identityMethod,
        'No locations assigned',
        'Ask an admin to assign one or more company locations to this employee.',
        employee.fullName
      );
    }

    const open = await this.attendanceRepo.getOpenCheckIn(employee.id);
    const action: AttendanceAction =
      input.action === 'auto' ? (open ? 'check_out' : 'check_in') : input.action;

    if (action === 'check_in' && open) {
      return fail(
        input.identityMethod,
        'Already checked in',
        'Check out before checking in again. Multiple pairs per day are allowed after checkout.',
        employee.fullName
      );
    }
    if (action === 'check_out' && !open) {
      return fail(
        input.identityMethod,
        'No active check-in',
        'You must check in before checking out.',
        employee.fullName
      );
    }

    let faceDetectionStatus: FaceDetectionStatus = FaceDetectionStatuses.NOT_CHECKED;
    let faceVerificationStatus: FaceVerificationStatus = FaceVerificationStatuses.NOT_CHECKED;
    let storedSelfiePath: string | null = null;

    // Identity: PIN *or* photo (not both). Photo is evidence only — no face matching.
    if (input.identityMethod === AuthMethods.EYE) {
      return fail(
        input.identityMethod,
        'Eye check disabled',
        'Use PIN or photo capture instead.',
        employee.fullName
      );
    }

    if (input.identityMethod === AuthMethods.PIN) {
      const pinResult = await this.pinAuth.verify(
        employee.id,
        input.pin ?? '',
        employee.pinHash
      );
      if (!pinResult.ok) {
        return fail(
          input.identityMethod,
          'PIN failed',
          pinResult.message,
          employee.fullName
        );
      }
      faceVerificationStatus = FaceVerificationStatuses.VERIFIED;
    } else if (input.identityMethod === AuthMethods.FACE) {
      if (!input.selfieUri) {
        return fail(
          input.identityMethod,
          'Photo required',
          'Capture a photo to check in or out.',
          employee.fullName
        );
      }
      // Employee was selected on the kiosk; photo is stored as evidence (not matched).
      faceVerificationStatus = FaceVerificationStatuses.VERIFIED;
      storedSelfiePath = await this.images.savePrivateImage(input.selfieUri, 'attendance');
    } else {
      return fail(
        input.identityMethod,
        'Unsupported method',
        'Choose PIN or photo.',
        employee.fullName
      );
    }

    // --- Location: GPS must match one of the employee's assigned offices ---
    let office: Office | null = null;
    let geofenceStatus: GeofenceStatus = GeofenceStatuses.NOT_CHECKED;
    let distanceMeters: number | null = null;
    let locationPermissionStatus: string | null = null;
    let locationValidationMessage: string | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;
    let accuracyMeters: number | null = null;

    try {
      const location = await this.locationService.getCurrentPosition();
      latitude = location.latitude;
      longitude = location.longitude;
      accuracyMeters = location.accuracyMeters;
      locationPermissionStatus = location.permissionStatus;

      const match = resolveAssignedOffice(
        location,
        assignedOffices,
        input.settings.selectedOfficeId,
        input.settings.gpsAccuracyThresholdMeters,
        this.geofenceService
      );
      office = match.office;
      geofenceStatus = match.geo.geofenceStatus;
      distanceMeters = match.geo.distanceMeters;
      locationValidationMessage = match.geo.validationMessage;

      if (!match.geo.accepted || !office) {
        const rejectOfficeId = office?.id ?? assignedOffices[0].id;
        const rejected = await this.persistRejectedAttempt({
          action,
          employeeId: employee.id,
          officeId: rejectOfficeId,
          latitude,
          longitude,
          accuracyMeters,
          distanceMeters,
          faceDetectionStatus,
          faceVerificationStatus,
          identityMethod: input.identityMethod,
          geofenceStatus,
          locationPermissionStatus,
          locationValidationMessage,
          rejectionReason: match.geo.validationMessage,
          storedSelfiePath,
        });
        return {
          ok: false,
          record: rejected,
          employeeName: employee.fullName,
          title: 'Attendance rejected',
          message: match.geo.validationMessage,
          identityMethod: input.identityMethod,
          faceDetectionStatus,
          faceVerificationStatus,
          geofenceStatus,
          biometricGateStatus: BiometricGateStatuses.NOT_USED,
          distanceMeters,
          latitude,
          longitude,
          accuracyMeters,
        };
      }
    } catch (error) {
      if (error instanceof LocationPermissionError) {
        geofenceStatus = GeofenceStatuses.PERMISSION_DENIED;
        locationPermissionStatus = error.status;
        locationValidationMessage = 'Foreground location permission is required.';
      } else {
        geofenceStatus = GeofenceStatuses.LOCATION_UNAVAILABLE;
        locationValidationMessage =
          error instanceof Error ? error.message : 'Unable to acquire GPS location.';
      }
      return {
        ok: false,
        record: null,
        employeeName: employee.fullName,
        title: 'Location required',
        message: locationValidationMessage ?? 'Location validation failed.',
        identityMethod: input.identityMethod,
        faceDetectionStatus,
        faceVerificationStatus,
        geofenceStatus,
        biometricGateStatus: BiometricGateStatuses.NOT_USED,
        distanceMeters,
        latitude,
        longitude,
        accuracyMeters,
      };
    }

    if (!office) {
      return fail(
        input.identityMethod,
        'No matching location',
        'Could not match GPS to an assigned company location.',
        employee.fullName
      );
    }
    const matchedOffice = office;

    const attendanceStatus =
      faceVerificationStatus === FaceVerificationStatuses.VERIFIED
        ? AttendanceStatuses.LOCALLY_ACCEPTED
        : AttendanceStatuses.PENDING_VERIFICATION;

    const timestamp = nowUtcIso();
    const label =
      latitude != null && longitude != null
        ? locationLabel(latitude, longitude, accuracyMeters)
        : null;

    const syncStatus = isFirebaseConfigured()
      ? SyncStatuses.SYNCED
      : SyncStatuses.PENDING_SYNC;

    let record: AttendanceRecord;
    if (action === 'check_in') {
      const id = createId();
      let evidencePath = storedSelfiePath;
      if (storedSelfiePath && isFirebaseStorageEnabled() && employee.companyId) {
        evidencePath = await uploadAttendancePhoto({
          companyId: employee.companyId,
          attendanceId: id,
          localUri: storedSelfiePath,
          kind: 'check_in',
        });
      }
      record = await this.attendanceRepo.create({
        id,
        employeeId: employee.id,
        officeId: matchedOffice.id,
        checkInAt: timestamp,
        checkOutAt: null,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInAccuracyMeters: accuracyMeters,
        checkInDistanceMeters: distanceMeters,
        checkOutLatitude: null,
        checkOutLongitude: null,
        checkOutAccuracyMeters: null,
        checkOutDistanceMeters: null,
        faceDetectionStatus,
        faceVerificationStatus,
        biometricGateStatus: BiometricGateStatuses.NOT_USED,
        identityMethod: input.identityMethod,
        geofenceStatus,
        attendanceStatus,
        rejectionReason: null,
        syncStatus,
        locationPermissionStatus,
        locationValidationMessage,
        checkInLocationLabel: label,
        checkOutLocationLabel: null,
      });
      if (evidencePath) {
        await this.attendanceRepo.insertEvidence({
          id: createId(),
          attendanceId: id,
          evidenceType: 'check_in_selfie',
          localFilePath: evidencePath,
          capturedAt: timestamp,
          retentionStatus: EvidenceRetentionStatuses.RETAINED,
        });
      }
    } else {
      let evidencePath = storedSelfiePath;
      if (storedSelfiePath && isFirebaseStorageEnabled() && employee.companyId) {
        evidencePath = await uploadAttendancePhoto({
          companyId: employee.companyId,
          attendanceId: open!.id,
          localUri: storedSelfiePath,
          kind: 'check_out',
        });
      }
      record = await this.attendanceRepo.updateCheckout(open!.id, {
        checkOutAt: timestamp,
        checkOutLatitude: latitude,
        checkOutLongitude: longitude,
        checkOutAccuracyMeters: accuracyMeters,
        checkOutDistanceMeters: distanceMeters,
        faceDetectionStatus,
        faceVerificationStatus,
        biometricGateStatus: BiometricGateStatuses.NOT_USED,
        identityMethod: input.identityMethod,
        geofenceStatus,
        attendanceStatus,
        rejectionReason: null,
        syncStatus,
        locationPermissionStatus,
        locationValidationMessage,
        checkOutLocationLabel: label,
      });
      if (evidencePath) {
        await this.attendanceRepo.insertEvidence({
          id: createId(),
          attendanceId: open!.id,
          evidenceType: 'check_out_selfie',
          localFilePath: evidencePath,
          capturedAt: timestamp,
          retentionStatus: EvidenceRetentionStatuses.RETAINED,
        });
      }
    }

    return {
      ok: true,
      record,
      employeeName: employee.fullName,
      title: action === 'check_in' ? 'Checked in' : 'Checked out',
      message: `${employee.fullName} · ${label ?? 'location recorded'}`,
      identityMethod: input.identityMethod,
      faceDetectionStatus,
      faceVerificationStatus,
      geofenceStatus,
      biometricGateStatus: BiometricGateStatuses.NOT_USED,
      distanceMeters,
      latitude,
      longitude,
      accuracyMeters,
    };
  }

  private async persistRejectedAttempt(params: {
    action: AttendanceAction;
    employeeId: string;
    officeId: string;
    latitude: number | null;
    longitude: number | null;
    accuracyMeters: number | null;
    distanceMeters: number | null;
    faceDetectionStatus: FaceDetectionStatus;
    faceVerificationStatus: FaceVerificationStatus;
    identityMethod: AuthMethod;
    geofenceStatus: GeofenceStatus;
    locationPermissionStatus: string | null;
    locationValidationMessage: string | null;
    rejectionReason: string;
    storedSelfiePath: string | null;
  }): Promise<AttendanceRecord> {
    const timestamp = nowUtcIso();
    const label =
      params.latitude != null && params.longitude != null
        ? locationLabel(params.latitude, params.longitude, params.accuracyMeters)
        : null;
    const id = createId();
    const syncStatus = isFirebaseConfigured()
      ? SyncStatuses.SYNCED
      : SyncStatuses.PENDING_SYNC;
    const created = await this.attendanceRepo.create({
      id,
      employeeId: params.employeeId,
      officeId: params.officeId,
      checkInAt: params.action === 'check_in' ? timestamp : null,
      checkOutAt: params.action === 'check_out' ? timestamp : null,
      checkInLatitude: params.action === 'check_in' ? params.latitude : null,
      checkInLongitude: params.action === 'check_in' ? params.longitude : null,
      checkInAccuracyMeters: params.action === 'check_in' ? params.accuracyMeters : null,
      checkInDistanceMeters: params.action === 'check_in' ? params.distanceMeters : null,
      checkOutLatitude: params.action === 'check_out' ? params.latitude : null,
      checkOutLongitude: params.action === 'check_out' ? params.longitude : null,
      checkOutAccuracyMeters: params.action === 'check_out' ? params.accuracyMeters : null,
      checkOutDistanceMeters: params.action === 'check_out' ? params.distanceMeters : null,
      faceDetectionStatus: params.faceDetectionStatus,
      faceVerificationStatus: params.faceVerificationStatus,
      biometricGateStatus: BiometricGateStatuses.NOT_USED,
      identityMethod: params.identityMethod,
      geofenceStatus: params.geofenceStatus,
      attendanceStatus: AttendanceStatuses.REJECTED,
      rejectionReason: params.rejectionReason,
      syncStatus,
      locationPermissionStatus: params.locationPermissionStatus,
      locationValidationMessage: params.locationValidationMessage,
      checkInLocationLabel: params.action === 'check_in' ? label : null,
      checkOutLocationLabel: params.action === 'check_out' ? label : null,
    });

    if (params.storedSelfiePath) {
      let evidencePath = params.storedSelfiePath;
      if (isFirebaseStorageEnabled()) {
        const employee = await this.employeeRepo.getById(params.employeeId);
        if (employee?.companyId) {
          evidencePath = await uploadAttendancePhoto({
            companyId: employee.companyId,
            attendanceId: id,
            localUri: params.storedSelfiePath,
            kind: `${params.action}_rejected`,
          });
        }
      }
      await this.attendanceRepo.insertEvidence({
        id: createId(),
        attendanceId: id,
        evidenceType: `${params.action}_selfie_rejected`,
        localFilePath: evidencePath,
        capturedAt: timestamp,
        retentionStatus: EvidenceRetentionStatuses.RETAINED,
      });
    }

    return created;
  }
}

/**
 * Pick an assigned office that accepts the current GPS.
 * Prefer the device's selected kiosk location when it is in the assigned set.
 */
function resolveAssignedOffice(
  location: DeviceLocation,
  assigned: Office[],
  preferredOfficeId: string | null,
  gpsAccuracyThresholdMeters: number,
  geofenceService: GeofenceService
): { office: Office | null; geo: GeofenceValidationResult } {
  const ordered = [...assigned].sort((a, b) => {
    if (preferredOfficeId && a.id === preferredOfficeId) return -1;
    if (preferredOfficeId && b.id === preferredOfficeId) return 1;
    return a.name.localeCompare(b.name);
  });

  let bestFail: { office: Office; geo: GeofenceValidationResult } | null = null;

  for (const candidate of ordered) {
    const geo = geofenceService.validate(location, {
      ...candidate,
      maxLocationAccuracyMeters: Math.min(
        candidate.maxLocationAccuracyMeters,
        gpsAccuracyThresholdMeters
      ),
    });
    if (geo.accepted) {
      return { office: candidate, geo };
    }
    if (
      !bestFail ||
      geo.distanceMeters < bestFail.geo.distanceMeters
    ) {
      bestFail = { office: candidate, geo };
    }
  }

  if (!bestFail) {
    return {
      office: null,
      geo: {
        distanceMeters: 0,
        geofenceStatus: GeofenceStatuses.OUTSIDE,
        validationMessage: 'No assigned locations to validate against.',
        accepted: false,
      },
    };
  }

  return {
    office: bestFail.office,
    geo: {
      ...bestFail.geo,
      validationMessage: `${bestFail.geo.validationMessage} (checked ${assigned.length} assigned location${assigned.length === 1 ? '' : 's'})`,
    },
  };
}

function fail(
  identityMethod: AuthMethod,
  title: string,
  message: string,
  employeeName: string | null = null
): AttendanceAttemptResult {
  return {
    ok: false,
    record: null,
    employeeName,
    title,
    message,
    identityMethod,
    faceDetectionStatus: FaceDetectionStatuses.NOT_CHECKED,
    faceVerificationStatus: FaceVerificationStatuses.NOT_CHECKED,
    geofenceStatus: GeofenceStatuses.NOT_CHECKED,
    biometricGateStatus: BiometricGateStatuses.NOT_USED,
    distanceMeters: null,
    latitude: null,
    longitude: null,
    accuracyMeters: null,
  };
}

import type { SQLiteDatabase } from 'expo-sqlite';

import { AttendanceRepository } from '@/features/attendance/repositories/AttendanceRepository';
import { AttendanceService } from '@/features/attendance/services/AttendanceService';
import { CompanyRepository } from '@/features/companies/repositories/CompanyRepository';
import { EmployeeRepository } from '@/features/employees/repositories/EmployeeRepository';
import { OfficeRepository } from '@/features/offices/repositories/OfficeRepository';
import { SettingsRepository } from '@/features/settings/repositories/SettingsRepository';
import { isFirebaseConfigured } from '@/firebase/config';
import { FirestoreAttendanceRepository } from '@/firebase/repositories/FirestoreAttendanceRepository';
import { FirestoreCompanyRepository } from '@/firebase/repositories/FirestoreCompanyRepository';
import { FirestoreEmployeeRepository } from '@/firebase/repositories/FirestoreEmployeeRepository';
import { FirestoreOfficeRepository } from '@/firebase/repositories/FirestoreOfficeRepository';
import { FirestoreSettingsRepository } from '@/firebase/repositories/FirestoreSettingsRepository';
import { HashPinAuthProvider } from '@/services/auth/PinAuthProvider';
import { ImageStorageService } from '@/services/camera/ImageStorageService';
import { CompositeFaceMatchProvider } from '@/services/face-verification/CompositeFaceMatchProvider';
import { BlinkEyeLivenessProvider } from '@/services/face-verification/EyeLivenessProvider';
import { ImageDescriptorFaceMatchProvider } from '@/services/face-verification/ImageDescriptorFaceMatchProvider';
import { OnDeviceFaceDetectionService } from '@/services/face-verification/OnDeviceFaceDetectionService';
import { OnDeviceFaceMatchProvider } from '@/services/face-verification/OnDeviceFaceMatchProvider';
import { HaversineGeofenceService } from '@/services/location/GeofenceService';
import { ExpoLocationService } from '@/services/location/LocationService';
import { NoOpAttendanceSyncService } from '@/services/sync/AttendanceSyncService';

type CompaniesApi = CompanyRepository | FirestoreCompanyRepository;
type EmployeesApi = EmployeeRepository | FirestoreEmployeeRepository;
type OfficesApi = OfficeRepository | FirestoreOfficeRepository;
type AttendanceApi = AttendanceRepository | FirestoreAttendanceRepository;
type SettingsApi = SettingsRepository | FirestoreSettingsRepository;

export class ServiceContainer {
  readonly companies: CompaniesApi;
  readonly employees: EmployeesApi;
  readonly offices: OfficesApi;
  readonly attendance: AttendanceApi;
  readonly settings: SettingsApi;
  readonly images: ImageStorageService;
  readonly location: ExpoLocationService;
  readonly geofence: HaversineGeofenceService;
  readonly faceDetection: OnDeviceFaceDetectionService;
  readonly faceVerification: CompositeFaceMatchProvider;
  readonly eyeLiveness: BlinkEyeLivenessProvider;
  readonly pinAuth: HashPinAuthProvider;
  readonly sync: NoOpAttendanceSyncService;
  readonly attendanceService: AttendanceService;
  readonly backend: 'firebase' | 'sqlite';

  private constructor(
    backend: 'firebase' | 'sqlite',
    companies: CompaniesApi,
    employees: EmployeesApi,
    offices: OfficesApi,
    attendance: AttendanceApi,
    settings: SettingsApi
  ) {
    this.backend = backend;
    this.companies = companies;
    this.employees = employees;
    this.offices = offices;
    this.attendance = attendance;
    this.settings = settings;
    this.images = new ImageStorageService();
    this.location = new ExpoLocationService();
    this.geofence = new HaversineGeofenceService();
    this.faceDetection = new OnDeviceFaceDetectionService();
    this.faceVerification = new CompositeFaceMatchProvider(
      new OnDeviceFaceMatchProvider(this.faceDetection),
      new ImageDescriptorFaceMatchProvider()
    );
    this.eyeLiveness = new BlinkEyeLivenessProvider();
    this.pinAuth = new HashPinAuthProvider();
    this.sync = new NoOpAttendanceSyncService();
    this.attendanceService = new AttendanceService(
      attendance,
      employees,
      this.location,
      this.geofence,
      this.faceDetection,
      this.faceVerification,
      this.eyeLiveness,
      this.pinAuth,
      this.images
    );
  }

  static createFirebase(): ServiceContainer {
    return new ServiceContainer(
      'firebase',
      new FirestoreCompanyRepository(),
      new FirestoreEmployeeRepository(),
      new FirestoreOfficeRepository(),
      new FirestoreAttendanceRepository(),
      new FirestoreSettingsRepository()
    );
  }

  static createSqlite(db: SQLiteDatabase): ServiceContainer {
    return new ServiceContainer(
      'sqlite',
      new CompanyRepository(db),
      new EmployeeRepository(db),
      new OfficeRepository(db),
      new AttendanceRepository(db),
      new SettingsRepository(db)
    );
  }

  static create(db?: SQLiteDatabase): ServiceContainer {
    if (isFirebaseConfigured()) {
      return ServiceContainer.createFirebase();
    }
    if (!db) {
      throw new Error('SQLite database required when Firebase is not configured.');
    }
    return ServiceContainer.createSqlite(db);
  }
}

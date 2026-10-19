import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

export function companiesCol(db: Firestore) {
  return collection(db, 'companies');
}

export function companyDoc(db: Firestore, companyId: string) {
  return doc(db, 'companies', companyId);
}

export function employeesCol(db: Firestore, companyId: string) {
  return collection(db, 'companies', companyId, 'employees');
}

export function employeeDoc(db: Firestore, companyId: string, employeeId: string) {
  return doc(db, 'companies', companyId, 'employees', employeeId);
}

export function officesCol(db: Firestore, companyId: string) {
  return collection(db, 'companies', companyId, 'offices');
}

export function officeDoc(db: Firestore, companyId: string, officeId: string) {
  return doc(db, 'companies', companyId, 'offices', officeId);
}

export function attendanceCol(db: Firestore, companyId: string) {
  return collection(db, 'companies', companyId, 'attendance');
}

export function attendanceDoc(db: Firestore, companyId: string, recordId: string) {
  return doc(db, 'companies', companyId, 'attendance', recordId);
}

export function evidenceCol(db: Firestore, companyId: string, recordId: string) {
  return collection(db, 'companies', companyId, 'attendance', recordId, 'evidence');
}

export function deviceSettingsDoc(db: Firestore, companyId: string, deviceId: string) {
  return doc(db, 'companies', companyId, 'deviceSettings', deviceId);
}

export type Col = CollectionReference;
export type Doc = DocumentReference;

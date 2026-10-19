import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  initializeAuth,
  type Persistence,
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

function readConfig(): FirebasePublicConfig | null {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim();
  const measurementId = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim();
  // Optional: defaults to {projectId}.firebaseapp.com (same as Console Web config).
  const authDomain =
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ||
    (projectId ? `${projectId}.firebaseapp.com` : undefined);

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId: measurementId || undefined,
  };
}

/** True when all required EXPO_PUBLIC_FIREBASE_* vars are set. */
export function isFirebaseConfigured(): boolean {
  return readConfig() != null;
}

/**
 * Firebase Storage uploads (punch photos). Off by default — photos stay on-device.
 * Set EXPO_PUBLIC_FIREBASE_USE_STORAGE=true when you enable Storage billing.
 */
export function isFirebaseStorageEnabled(): boolean {
  return (
    isFirebaseConfigured() &&
    process.env.EXPO_PUBLIC_FIREBASE_USE_STORAGE?.trim().toLowerCase() === 'true'
  );
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const config = readConfig();
  if (!config) {
    throw new Error(
      'Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* values to .env (see FIREBASE.md).'
    );
  }
  app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

/**
 * RN Auth ships getReactNativePersistence; TS types for firebase/auth often omit it.
 * Metro is configured to resolve the RN Auth bundle on native.
 */
function rnPersistence(storage: typeof AsyncStorage): Persistence {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const authMod = require('@firebase/auth') as {
    getReactNativePersistence?: (s: typeof AsyncStorage) => Persistence;
  };
  if (!authMod.getReactNativePersistence) {
    throw new Error(
      'Firebase Auth RN persistence missing. Restart Metro with --clear after metro.config.js change.'
    );
  }
  return authMod.getReactNativePersistence(storage);
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  const firebaseApp = getFirebaseApp();

  if (Platform.OS === 'web') {
    auth = getAuth(firebaseApp);
    return auth;
  }

  try {
    auth = initializeAuth(firebaseApp, {
      persistence: rnPersistence(AsyncStorage),
    });
  } catch {
    // Fast Refresh / second init
    auth = getAuth(firebaseApp);
  }
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (storage) return storage;
  storage = getStorage(getFirebaseApp());
  return storage;
}

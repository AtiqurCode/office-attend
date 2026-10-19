import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { AuthMethods } from '@/constants/auth';
import type { Company } from '@/features/companies/types';
import { getFirebaseAuth, getFirestoreDb } from '@/firebase/config';
import { setBoundCompanyId } from '@/firebase/deviceBinding';
import { assertOnline } from '@/firebase/online';
import { companyDoc } from '@/firebase/paths';
import { FirestoreCompanyRepository } from '@/firebase/repositories/FirestoreCompanyRepository';
import { nowUtcIso } from '@/utils/datetime';

export type AuthProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export function toAuthProfile(user: User): AuthProfile {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export function waitForAuthUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

export async function registerWithEmail(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: User; company: Company }> {
  await assertOnline();
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(
    auth,
    input.email.trim(),
    input.password
  );
  const name = input.name.trim();
  if (name) {
    await updateProfile(cred.user, { displayName: name });
  }
  const company = await ensureCompanyForUser(cred.user);
  return { user: cred.user, company };
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
}): Promise<{ user: User; company: Company }> {
  await assertOnline();
  const cred = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    input.email.trim(),
    input.password
  );
  const company = await ensureCompanyForUser(cred.user);
  return { user: cred.user, company };
}

export async function signInWithGoogleIdToken(
  idToken: string
): Promise<{ user: User; company: Company }> {
  await assertOnline();
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(getFirebaseAuth(), credential);
  const company = await ensureCompanyForUser(cred.user);
  return { user: cred.user, company };
}

export async function signOutAccount(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/**
 * First login: create company named after the user + save user profile.
 * Later logins: load that company.
 */
export async function ensureCompanyForUser(user: User): Promise<Company> {
  await assertOnline();
  const companies = new FirestoreCompanyRepository();
  const existing = await companies.getByOwnerUid(user.uid);
  if (existing) {
    await setBoundCompanyId(existing.id);
    await upsertUserProfile(user, existing.id);
    return existing;
  }

  const companyName =
    user.displayName?.trim() ||
    user.email?.split('@')[0]?.trim() ||
    'My Company';

  const company = await companies.create({
    name: companyName,
    enabledAuthMethods: [AuthMethods.PIN, AuthMethods.FACE],
    ownerUid: user.uid,
    ownerEmail: user.email,
    ownerDisplayName: user.displayName,
  });
  await upsertUserProfile(user, company.id);
  return company;
}

async function upsertUserProfile(user: User, companyId: string): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(db, 'users', user.uid);
  const now = nowUtcIso();
  const prev = await getDoc(ref);
  await setDoc(
    ref,
    {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      companyId,
      updatedAt: now,
      ...(prev.exists() ? {} : { createdAt: now }),
    },
    { merge: true }
  );
  // Touch company so owner profile stays in sync.
  await setDoc(
    companyDoc(db, companyId),
    {
      ownerEmail: user.email ?? null,
      ownerDisplayName: user.displayName ?? null,
      updatedAt: now,
    },
    { merge: true }
  );
}

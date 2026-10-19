import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';

import { getFirebaseAuth } from '@/firebase/config';

export async function ensureFirebaseUser(): Promise<User> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;

  const existing = await new Promise<User | null>((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
  if (existing) return existing;

  const cred = await signInAnonymously(auth);
  return cred.user;
}

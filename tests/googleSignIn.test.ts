jest.mock('@/firebase/authAccount', () => ({
  signInWithGoogleIdToken: jest.fn(),
}));

jest.mock('@/firebase/authAccount', () => ({
  signInWithGoogleIdToken: jest.fn(),
}));

import {
  isGoogleSignInConfigured,
  mapGoogleSignInError,
  reversedGoogleClientId,
} from '@/services/auth/googleSignIn';

describe('reversedGoogleClientId', () => {
  it('builds the iOS URL scheme from a web client id', () => {
    expect(
      reversedGoogleClientId('200870263438-abc.apps.googleusercontent.com')
    ).toBe('com.googleusercontent.apps.200870263438-abc');
  });

  it('returns null for junk', () => {
    expect(reversedGoogleClientId('not-a-client')).toBeNull();
    expect(reversedGoogleClientId('')).toBeNull();
  });
});

describe('mapGoogleSignInError', () => {
  it('explains DEVELOPER_ERROR / SHA-1 misconfig', () => {
    const msg = mapGoogleSignInError({ code: 'DEVELOPER_ERROR', message: 'dev' });
    expect(msg).toMatch(/SHA-1/);
    expect(msg).toMatch(/Web client ID/);
  });

  it('explains missing native module', () => {
    expect(mapGoogleSignInError(new Error('NitroModules could not be found'))).toMatch(
      /EAS APK|Expo Go/
    );
  });

  it('treats cancel as empty', () => {
    expect(mapGoogleSignInError({ code: 'SIGN_IN_CANCELLED', message: 'x' })).toBe('');
  });

  it('explains Play Services', () => {
    expect(
      mapGoogleSignInError({ code: 'PLAY_SERVICES_NOT_AVAILABLE', message: 'x' })
    ).toMatch(/Play Services/);
  });
});

describe('isGoogleSignInConfigured', () => {
  const prev = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  afterEach(() => {
    if (prev === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    else process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = prev;
  });

  it('is false when unset', () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    expect(isGoogleSignInConfigured()).toBe(false);
  });

  it('is true when set', () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'x.apps.googleusercontent.com';
    expect(isGoogleSignInConfigured()).toBe(true);
  });
});

describe('signInWithGoogleNative', () => {
  const prev = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  afterEach(() => {
    jest.resetModules();
    if (prev === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    else process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = prev;
  });

  it('fails fast without web client id', async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { signInWithGoogleNative: run } = require('@/services/auth/googleSignIn');
    await expect(run()).resolves.toMatchObject({
      ok: false,
      cancelled: false,
      message: expect.stringMatching(/GOOGLE_WEB_CLIENT_ID/),
    });
  });
});

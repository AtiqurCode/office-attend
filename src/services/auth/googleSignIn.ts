import { Platform } from 'react-native';

import { signInWithGoogleIdToken } from '@/firebase/authAccount';
import type { Company } from '@/features/companies/types';
import type { User } from 'firebase/auth';

export type GoogleSignInResult =
  | { ok: true; user: User; company: Company }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; message: string };

function webClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
}

export function isGoogleSignInConfigured(): boolean {
  return webClientId().length > 0;
}

/** Reversed iOS URL scheme from a Web/iOS client ID (xxx.apps.googleusercontent.com). */
export function reversedGoogleClientId(clientId: string): string | null {
  const id = clientId.trim();
  const suffix = '.apps.googleusercontent.com';
  if (!id.endsWith(suffix)) return null;
  const prefix = id.slice(0, -suffix.length);
  if (!prefix) return null;
  return `com.googleusercontent.apps.${prefix}`;
}

function isMissingNativeModule(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return (
    message.includes('NitroModules') ||
    message.includes('could not be found') ||
    message.includes('TurboModuleRegistry')
  );
}

export function mapGoogleSignInError(e: unknown): string {
  if (isMissingNativeModule(e)) {
    return 'Google sign-in needs a development/EAS APK (not Expo Go). Rebuild after installing react-native-nitro-google-signin.';
  }

  const code =
    e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
  const message = e instanceof Error ? e.message : String(e);

  if (code === 'SIGN_IN_CANCELLED' || /cancel/i.test(message)) {
    return '';
  }
  if (code === 'PLAY_SERVICES_NOT_AVAILABLE') {
    return 'Google Play Services is missing or outdated on this device.';
  }
  if (code === 'DEVELOPER_ERROR' || /DEVELOPER_ERROR/i.test(message)) {
    return (
      'Google rejected this APK (DEVELOPER_ERROR). Fix Firebase Android app setup: ' +
      'package com.attendface.app + add the EAS keystore SHA-1/SHA-256, then download a fresh ' +
      'google-services.json. Also use the Web client ID (not the Android client ID) as ' +
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID — see FIREBASE.md § Google Sign-In.'
    );
  }
  if (code === 'ONE_TAP_START_FAILED') {
    return 'Google One Tap failed to start. Try again, or check Play Services / network.';
  }
  if (/network|NETWORK/i.test(code + message)) {
    return 'Network error talking to Google. Use mobile data or Wi‑Fi with internet.';
  }
  if (/invalid-credential|INVALID_ID_TOKEN|id.?token/i.test(code + message)) {
    return 'Firebase rejected the Google ID token. Confirm Google provider is enabled and WEB client ID matches this Firebase project.';
  }

  return message || 'Google sign-in failed';
}

/**
 * Native Google One Tap / Credential Manager → Firebase Auth → company bootstrap.
 * Requires a binary that includes react-native-nitro-google-signin (EAS / run:android).
 */
export async function signInWithGoogleNative(): Promise<GoogleSignInResult> {
  const clientId = webClientId();
  if (!clientId) {
    return {
      ok: false,
      cancelled: false,
      message: 'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env / EAS preview env.',
    };
  }
  if (Platform.OS === 'web') {
    return {
      ok: false,
      cancelled: false,
      message: 'Google sign-in runs in the Android app build.',
    };
  }

  try {
    const {
      GoogleOneTapSignIn,
      isCancelledResponse,
      isNoSavedCredentialFoundResponse,
      isSuccessResponse,
    } = await import('react-native-nitro-google-signin');

    // Always the Web OAuth client from the same Firebase/GCP project — never the Android client ID.
    GoogleOneTapSignIn.configure({
      webClientId: clientId,
      autoSelectOnSignIn: false,
    });

    await GoogleOneTapSignIn.checkPlayServices(true);

    let response = await GoogleOneTapSignIn.signIn();
    if (isNoSavedCredentialFoundResponse(response)) {
      response = await GoogleOneTapSignIn.createAccount();
    }
    if (isNoSavedCredentialFoundResponse(response)) {
      response = await GoogleOneTapSignIn.presentExplicitSignIn();
    }
    if (isCancelledResponse(response)) {
      return { ok: false, cancelled: true };
    }
    if (!isSuccessResponse(response) || !response.data.idToken) {
      return {
        ok: false,
        cancelled: false,
        message: 'Google sign-in did not return an ID token.',
      };
    }

    const { user, company } = await signInWithGoogleIdToken(response.data.idToken);
    return { ok: true, user, company };
  } catch (e) {
    const mapped = mapGoogleSignInError(e);
    if (!mapped) return { ok: false, cancelled: true };
    return { ok: false, cancelled: false, message: mapped };
  }
}

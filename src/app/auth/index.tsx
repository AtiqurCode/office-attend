import * as Google from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormKeyboardScroll } from '@/components/ui/FormKeyboardScroll';
import { TextField } from '@/components/ui/TextField';
import { APP_NAME } from '@/constants/config';
import type { Company } from '@/features/companies/types';
import {
  registerWithEmail,
  signInWithEmail,
  signInWithGoogleIdToken,
  toAuthProfile,
} from '@/firebase/authAccount';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';
import { href } from '@/utils/navigation';
import type { User } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'login' | 'register';

function googleClientIds() {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || undefined,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || undefined,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined,
  };
}

export default function AuthScreen() {
  const theme = useAppTheme();
  const services = useServices();
  const setAuthUser = useAppStore((s) => s.setAuthUser);
  const setCompany = useAppStore((s) => s.setCompany);
  const setOffice = useAppStore((s) => s.setOffice);
  const setEmployees = useAppStore((s) => s.setEmployees);
  const setSettings = useAppStore((s) => s.setSettings);

  const [mode, setMode] = useState<Mode>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clients = googleClientIds();
  const webClientId = clients.webClientId;
  const googleEnabled = Boolean(webClientId);
  // Hook cannot be conditional — always pass a string so Android doesn't throw
  // `androidClientId must be defined`. Prefer Web client when platform ids omit.
  const resolvedWeb =
    webClientId || '000000000000-placeholder.apps.googleusercontent.com';
  const androidClientId = clients.androidClientId || resolvedWeb;
  const iosClientId = clients.iosClientId || resolvedWeb;

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: resolvedWeb,
    webClientId: resolvedWeb,
    androidClientId,
    iosClientId,
  });

  const finishAuth = useCallback(
    async (user: User, company: Company) => {
      setAuthUser(toAuthProfile(user));
      setCompany(company);
      const settings = await services.settings.getSettings();
      const office =
        (await services.offices.getDefault(company.id)) ??
        (settings.selectedOfficeId
          ? await services.offices.getById(settings.selectedOfficeId)
          : null);
      setOffice(office);
      setEmployees(await services.employees.listByCompany(company.id));
      setSettings(settings);

      if (!settings.onboardingCompleted || !office) {
        router.replace(href('/onboarding'));
        return;
      }
      router.replace(href('/(tabs)/home'));
    },
    [
      services.employees,
      services.offices,
      services.settings,
      setAuthUser,
      setCompany,
      setEmployees,
      setOffice,
      setSettings,
    ]
  );

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!email.trim() || password.length < 6) {
        setError('Use a valid email and password (6+ characters).');
        return;
      }
      if (mode === 'register' && !name.trim()) {
        setError('Enter your name — it becomes the company name.');
        return;
      }
      const result =
        mode === 'register'
          ? await registerWithEmail({ name, email, password })
          : await signInWithEmail({ email, password });
      await finishAuth(result.user, result.company);
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const submitGoogle = async () => {
    if (!webClientId) {
      setError('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await promptAsync();
      if (result.type !== 'success') {
        if (result.type !== 'dismiss' && result.type !== 'cancel') {
          setError('Google sign-in was not completed.');
        }
        return;
      }
      const idToken =
        result.params.id_token ||
        ('authentication' in result ? result.authentication?.idToken : null) ||
        null;
      if (!idToken) {
        setError('Google sign-in did not return an ID token. Check Web client ID.');
        return;
      }
      const { user, company } = await signInWithGoogleIdToken(idToken);
      await finishAuth(user, company);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormKeyboardScroll
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
      keyboardVerticalOffset={0}
    >
      <Text style={[styles.brand, { color: theme.brand }]}>{APP_NAME}</Text>
      <Text style={[styles.title, { color: theme.text }]}>
        {mode === 'register' ? 'Create account' : 'Sign in'}
      </Text>
      <Text style={{ color: theme.textSecondary, lineHeight: 22 }}>
        {mode === 'register'
          ? 'Your name becomes the company name on first setup. Add a site next.'
          : 'Sign in to open your company workspace.'}
      </Text>

      {mode === 'register' ? (
        <TextField
          label="Your name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholder="e.g. Acme Office"
        />
      ) : null}
      <TextField
        label="Email"
        email
        value={email}
        onChangeText={setEmail}
        placeholder="you@company.com"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        autoComplete={mode === 'register' ? 'new-password' : 'password'}
        textContentType={mode === 'register' ? 'newPassword' : 'password'}
      />

      {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}

      <Button
        title={mode === 'register' ? 'Register' : 'Sign in'}
        onPress={submit}
        loading={busy}
      />

      {googleEnabled ? (
        <Button
          title="Continue with Google"
          variant="secondary"
          disabled={!request || busy}
          onPress={submitGoogle}
        />
      ) : (
        <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>
          Google sign-in: add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env (Firebase →
          Authentication → Google → Web client ID).
        </Text>
      )}

      <View style={styles.switchRow}>
        <Text style={{ color: theme.textSecondary }}>
          {mode === 'register' ? 'Already have an account?' : 'New here?'}
        </Text>
        <Pressable
          onPress={() => {
            setMode((m) => (m === 'register' ? 'login' : 'register'));
            setError(null);
          }}
        >
          <Text style={{ color: theme.brand, fontWeight: '700' }}>
            {mode === 'register' ? 'Sign in' : 'Register'}
          </Text>
        </Pressable>
      </View>
    </FormKeyboardScroll>
  );
}

function mapAuthError(e: unknown): string {
  const code =
    e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
  if (code.includes('email-already-in-use')) return 'Email already registered — sign in instead.';
  if (code.includes('invalid-credential') || code.includes('wrong-password')) {
    return 'Wrong email or password.';
  }
  if (code.includes('user-not-found')) return 'No account for that email — register first.';
  if (code.includes('weak-password')) return 'Password too weak (use 6+ characters).';
  if (code.includes('invalid-email')) return 'Invalid email address.';
  return e instanceof Error ? e.message : 'Authentication failed';
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 14, paddingTop: 56 },
  brand: { fontSize: 14, fontWeight: '800', letterSpacing: 0.6 },
  title: { fontSize: 28, fontWeight: '700' },
  switchRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 8 },
});

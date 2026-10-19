import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { ScreenLoading } from '@/components/ui/ScreenLoading';
import { APP_NAME, DATABASE_NAME } from '@/constants/config';
import { initializeDatabase } from '@/database/client';
import { toAuthProfile, waitForAuthUser } from '@/firebase/authAccount';
import { isFirebaseConfigured } from '@/firebase/config';
import { OfflineError, assertOnline, isConnectivityError } from '@/firebase/online';
import { ServicesContext } from '@/hooks/useServices';
import { ServiceContainer } from '@/services/ServiceContainer';
import { useAppStore } from '@/store/appStore';
import { DarkTheme, LightTheme } from '@/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  const firebase = isFirebaseConfigured();

  return (
    <QueryClientProvider client={queryClient}>
      {firebase ? (
        <AppBootstrap mode="firebase" />
      ) : (
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
          <SqliteBootstrap />
        </SQLiteProvider>
      )}
    </QueryClientProvider>
  );
}

function SqliteBootstrap() {
  const db = useSQLiteContext();
  return <AppBootstrap mode="sqlite" db={db} />;
}

function AppBootstrap({
  mode,
  db,
}: {
  mode: 'firebase' | 'sqlite';
  db?: ReturnType<typeof useSQLiteContext>;
}) {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? DarkTheme : LightTheme;
  const [services, setServices] = useState<ServiceContainer | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [offlineLooking, setOfflineLooking] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const setAuthUser = useAppStore((s) => s.setAuthUser);
  const setCompany = useAppStore((s) => s.setCompany);
  const setEmployees = useAppStore((s) => s.setEmployees);
  const setOffice = useAppStore((s) => s.setOffice);
  const setSettings = useAppStore((s) => s.setSettings);
  const setHydrated = useAppStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Yield so the effect does not call setState synchronously.
        await Promise.resolve();
        if (cancelled) return;

        if (mode === 'firebase') {
          await assertOnline();
        }
        if (cancelled) return;

        const container =
          mode === 'firebase'
            ? ServiceContainer.createFirebase()
            : ServiceContainer.createSqlite(db!);

        let authUser = null;
        if (mode === 'firebase') {
          const user = await waitForAuthUser();
          authUser = user ? toAuthProfile(user) : null;
        }
        if (cancelled) return;

        const company =
          mode === 'firebase' && !authUser
            ? null
            : await container.companies.getPrimary();
        const settings = await container.settings.getSettings();
        const employees = company
          ? await container.employees.listByCompany(company.id)
          : [];
        const office = company
          ? settings.selectedOfficeId
            ? await container.offices.getById(settings.selectedOfficeId)
            : await container.offices.getDefault(company.id)
          : null;
        if (cancelled) return;

        setBootError(null);
        setOfflineLooking(false);
        setAuthUser(authUser);
        setCompany(company);
        setEmployees(employees);
        setOffice(office);
        setSettings(settings);
        setServices(container);
        setHydrated(true);
        await SplashScreen.hideAsync();
      } catch (e) {
        if (cancelled) return;
        const message =
          e instanceof OfflineError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Failed to start app';
        setOfflineLooking(isConnectivityError(e));
        setBootError(message);
        setServices(null);
        await SplashScreen.hideAsync();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    db,
    mode,
    retryToken,
    setAuthUser,
    setCompany,
    setEmployees,
    setHydrated,
    setOffice,
    setSettings,
  ]);

  const stackScreenOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: theme.surface },
      headerTintColor: theme.text,
      headerTitleStyle: { fontWeight: '700' as const },
      contentStyle: { backgroundColor: theme.background },
    }),
    [theme]
  );

  if (bootError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.background,
          padding: 24,
          gap: 12,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
          {offlineLooking ? 'Online required' : 'Could not start'}
        </Text>
        <Text style={{ color: theme.textSecondary, textAlign: 'center', lineHeight: 22 }}>
          {bootError}
        </Text>
        <Pressable
          onPress={() => setRetryToken((n) => n + 1)}
          style={{
            marginTop: 8,
            backgroundColor: theme.brand,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!services) {
    return (
      <ScreenLoading
        message={
          mode === 'firebase'
            ? `Starting ${APP_NAME}… connecting to cloud`
            : `Starting ${APP_NAME}…`
        }
      />
    );
  }

  return (
    <ServicesContext.Provider value={services}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/index" options={{ title: 'Account', headerShown: false }} />
        <Stack.Screen name="onboarding/index" options={{ title: 'Company setup' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="kiosk/verify" options={{ title: 'Confirm' }} />
        <Stack.Screen name="kiosk/result" options={{ title: 'Result', headerShown: false }} />
        <Stack.Screen name="admin/employees" options={{ title: 'Employees' }} />
        <Stack.Screen name="admin/employees-bulk" options={{ title: 'Bulk people' }} />
        <Stack.Screen name="admin/employee-form" options={{ title: 'Employee' }} />
        <Stack.Screen name="admin/face-enroll" options={{ title: 'Face enrollment' }} />
        <Stack.Screen name="admin/locations" options={{ title: 'Locations' }} />
        <Stack.Screen name="admin/company" options={{ title: 'Company' }} />
        <Stack.Screen name="admin/forgot-punch" options={{ title: 'Forgot punch' }} />
        <Stack.Screen name="admin/reports" options={{ title: 'Reports & export' }} />
        <Stack.Screen name="attendance/[id]" options={{ title: 'Attendance detail' }} />
        <Stack.Screen name="settings/privacy" options={{ title: 'Privacy' }} />
      </Stack>
    </ServicesContext.Provider>
  );
}

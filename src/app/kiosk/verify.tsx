import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FaceGuide } from '@/components/FaceGuide';
import { Button } from '@/components/ui/Button';
import { AuthMethods, type AuthMethod } from '@/constants/auth';
import { EMPLOYEE_PIN_LENGTH } from '@/constants/pin';
import { GeofenceStatuses } from '@/constants/status';
import type { Employee } from '@/features/employees/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';
import { paramString } from '@/utils/navigation';

type KioskMethod = typeof AuthMethods.PIN | typeof AuthMethods.FACE;

function asKioskMethod(value: string): KioskMethod | null {
  if (value === AuthMethods.PIN || value === AuthMethods.FACE) return value;
  return null;
}

export default function KioskVerifyScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const services = useServices();
  const params = useLocalSearchParams<{
    employeeId?: string | string[];
    action?: string | string[];
    method?: string | string[];
  }>();
  const employeeId = paramString(params.employeeId);
  const preferredMethod = asKioskMethod(paramString(params.method));

  const company = useAppStore((s) => s.company);
  const settings = useAppStore((s) => s.settings);
  const employees = useAppStore((s) => s.employees);
  const selectedEmployee = useAppStore((s) => s.selectedEmployee);
  const setSelectedEmployee = useAppStore((s) => s.setSelectedEmployee);

  const [employee, setEmployee] = useState<Employee | null>(
    () =>
      employees.find((e) => e.id === employeeId) ??
      (selectedEmployee?.id === employeeId ? selectedEmployee : null) ??
      selectedEmployee
  );

  const availableMethods = useMemo(() => {
    const enabled = company?.enabledAuthMethods ?? [AuthMethods.PIN, AuthMethods.FACE];
    const allowed: KioskMethod[] = [];
    if (enabled.includes(AuthMethods.PIN)) allowed.push(AuthMethods.PIN);
    if (enabled.includes(AuthMethods.FACE)) allowed.push(AuthMethods.FACE);
    return allowed.length ? allowed : ([AuthMethods.PIN] as KioskMethod[]);
  }, [company?.enabledAuthMethods]);

  const [method, setMethod] = useState<KioskMethod>(
    () =>
      (preferredMethod && availableMethods.includes(preferredMethod)
        ? preferredMethod
        : availableMethods[0]) ?? AuthMethods.PIN
  );
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [checkedIn, setCheckedIn] = useState<boolean | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Resolve person from list, store, or DB so "Try again" never loses them.
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      const fromList = employeeId
        ? employees.find((e) => e.id === employeeId)
        : undefined;
      if (fromList) {
        if (!cancelled) {
          setEmployee(fromList);
          if (selectedEmployee?.id !== fromList.id) setSelectedEmployee(fromList);
        }
        return;
      }
      if (selectedEmployee && (!employeeId || selectedEmployee.id === employeeId)) {
        if (!cancelled) setEmployee(selectedEmployee);
        return;
      }
      if (!employeeId) {
        if (!cancelled) setEmployee(null);
        return;
      }
      const fromDb = await services.employees.getById(employeeId);
      if (!cancelled) {
        setEmployee(fromDb);
        if (fromDb && selectedEmployee?.id !== fromDb.id) setSelectedEmployee(fromDb);
      }
    };
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [employeeId, employees, selectedEmployee, services.employees, setSelectedEmployee]);

  useEffect(() => {
    if (!employee) return;
    let cancelled = false;
    void services.attendance.getOpenCheckIn(employee.id).then((open) => {
      if (!cancelled) setCheckedIn(!!open);
    });
    return () => {
      cancelled = true;
    };
  }, [employee, services.attendance]);

  const punchLabel = checkedIn == null ? 'Confirm' : checkedIn ? 'Check out' : 'Check in';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: punchLabel,
      headerShadowVisible: false,
      headerStyle: { backgroundColor: theme.background },
      headerTintColor: theme.text,
      headerTitleStyle: { fontWeight: '600', fontSize: 17 },
    });
  }, [navigation, punchLabel, theme.background, theme.text]);

  if (!employee || !settings) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Person not found</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const runAttempt = async (opts: {
    identityMethod: AuthMethod;
    pin?: string;
    selfieUri: string | null;
  }) => {
    setBusy(true);
    setError(null);
    try {
      const result = await services.attendanceService.attempt({
        action: 'auto',
        employeeId: employee.id,
        identityMethod: opts.identityMethod,
        pin: opts.pin,
        selfieUri: opts.selfieUri,
        settings,
      });

      // PIN / photo / pre-GPS failures — stay on this screen (don't bounce to list).
      if (!result.ok && result.geofenceStatus === GeofenceStatuses.NOT_CHECKED) {
        const nextFails = failCount + 1;
        setFailCount(nextFails);
        setPin('');
        setError(
          nextFails >= 3
            ? `${result.message} Keep trying — attempt ${nextFails}.`
            : result.message
        );
        return;
      }

      // Keep selectedEmployee so result → Try again can reopen PIN/photo.
      router.replace({
        pathname: '/kiosk/result',
        params: {
          ok: result.ok ? '1' : '0',
          employeeId: employee.id,
          method: result.identityMethod,
          title: result.title,
          message: result.message,
          name: result.employeeName ?? '',
          lat: result.latitude != null ? String(result.latitude) : '',
          lng: result.longitude != null ? String(result.longitude) : '',
          acc: result.accuracyMeters != null ? String(result.accuracyMeters) : '',
          dist: result.distanceMeters != null ? String(result.distanceMeters) : '',
        },
      });

      if (result.ok) {
        setSelectedEmployee(null);
      }
    } catch (e) {
      const nextFails = failCount + 1;
      setFailCount(nextFails);
      setPin('');
      setError(
        nextFails >= 3
          ? `${e instanceof Error ? e.message : 'Could not save attendance'} Keep trying — attempt ${nextFails}.`
          : e instanceof Error
            ? e.message
            : 'Could not save attendance'
      );
    } finally {
      setBusy(false);
    }
  };

  const appendPin = (digit: string) => {
    if (busy || pin.length >= EMPLOYEE_PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    setError(null);
    if (next.length === EMPLOYEE_PIN_LENGTH) {
      void runAttempt({ identityMethod: AuthMethods.PIN, pin: next, selfieUri: null });
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || busy) return;
    setError(null);
    let uri: string | null = null;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.75 });
      uri = photo?.uri ?? null;
    } catch (e) {
      setFailCount((c) => c + 1);
      setError(
        e instanceof Error
          ? `${e.message} Stay on this screen and try again.`
          : 'Photo failed — stay here and try again.'
      );
      setBusy(false);
      return;
    }
    setBusy(false);
    if (!uri) {
      setFailCount((c) => c + 1);
      setError('Photo failed — stay here and try again.');
      return;
    }
    await runAttempt({
      identityMethod: AuthMethods.FACE,
      selfieUri: uri,
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Person */}
      <View style={styles.personBlock}>
        {employee.profileImagePath ? (
          <Image source={{ uri: employee.profileImagePath }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.brandSoft }]}>
            <Text style={{ color: theme.brand, fontWeight: '700', fontSize: 20 }}>
              {employee.fullName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.personText}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {employee.fullName}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{employee.employeeCode}</Text>
        </View>
        {checkedIn != null ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: checkedIn ? theme.accentSoft : theme.brandSoft },
            ]}
          >
            <Text
              style={{
                color: checkedIn ? theme.warning : theme.brand,
                fontWeight: '700',
                fontSize: 12,
              }}
            >
              {checkedIn ? 'OUT' : 'IN'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Method switch */}
      {availableMethods.length > 1 ? (
        <View style={[styles.segment, { backgroundColor: theme.surfaceMuted }]}>
          {availableMethods.map((key) => {
            const selected = method === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setMethod(key);
                  setError(null);
                }}
                style={[
                  styles.segmentItem,
                  selected && { backgroundColor: theme.surface },
                  selected && styles.segmentSelected,
                ]}
              >
                <Text
                  style={{
                    color: selected ? theme.text : theme.textSecondary,
                    fontWeight: selected ? '700' : '600',
                    fontSize: 15,
                  }}
                >
                  {key === AuthMethods.PIN ? 'PIN' : 'Photo'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Body */}
      <View style={styles.body}>
        {method === AuthMethods.PIN ? (
          <View style={styles.pinBlock}>
            <Text style={[styles.pinPrompt, { color: theme.textSecondary }]}>
              Enter {EMPLOYEE_PIN_LENGTH}-digit PIN to {punchLabel.toLowerCase()}
            </Text>
            <View style={styles.dots}>
              {Array.from({ length: EMPLOYEE_PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i < pin.length ? theme.brand : theme.surfaceMuted,
                      borderColor: theme.border,
                    },
                  ]}
                />
              ))}
            </View>
            {busy ? <ActivityIndicator color={theme.brand} /> : null}
            <View style={styles.pad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', ''].map((key, idx) => {
                if (!key) {
                  return <View key={`spacer-${idx}`} style={styles.key} />;
                }
                return (
                  <Pressable
                    key={key}
                    disabled={busy}
                    style={({ pressed }) => [
                      styles.key,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        opacity: pressed || busy ? 0.85 : 1,
                      },
                    ]}
                    onPress={() => {
                      if (key === '⌫') {
                        setPin((p) => p.slice(0, -1));
                        setError(null);
                      } else {
                        appendPin(key);
                      }
                    }}
                  >
                    <Text style={{ color: theme.text, fontSize: 24, fontWeight: '700' }}>
                      {key}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : !permission?.granted ? (
          <View style={styles.permBlock}>
            <Text style={[styles.permTitle, { color: theme.text }]}>Camera needed</Text>
            <Text style={{ color: theme.textSecondary, lineHeight: 22, textAlign: 'center' }}>
              We save one photo with your punch. Nothing is face-matched.
            </Text>
            <Button title="Allow camera" onPress={requestPermission} />
          </View>
        ) : (
          <View style={[styles.cameraCard, { borderColor: theme.border }]}>
            <CameraView ref={cameraRef} style={styles.camera} facing="front" />
            <FaceGuide hint="Center your face, then tap below" />
          </View>
        )}
      </View>

      {error ? (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      ) : null}

      {/* Footer actions */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {method === AuthMethods.FACE && permission?.granted ? (
          <Pressable
            disabled={busy}
            onPress={capturePhoto}
            style={({ pressed }) => [
              styles.shutterOuter,
              { borderColor: theme.brand, opacity: pressed || busy ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.shutterInner, { backgroundColor: theme.brand }]}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.shutterLabel}>{punchLabel}</Text>
              )}
            </View>
          </Pressable>
        ) : null}
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.cancelTap}>
          <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 16 }}>
            Cancel
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  personBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personText: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 20, fontWeight: '700' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16, minHeight: 0 },
  pinBlock: { flex: 1, justifyContent: 'space-between', paddingBottom: 8 },
  pinPrompt: { textAlign: 'center', fontSize: 15, fontWeight: '500' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  key: {
    width: '30%',
    minHeight: 60,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 12,
  },
  permTitle: { fontSize: 20, fontWeight: '700' },
  cameraCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    minHeight: 280,
    backgroundColor: '#111',
  },
  camera: { flex: 1 },
  error: {
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  shutterInner: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  shutterLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  cancelTap: { paddingVertical: 4 },
});

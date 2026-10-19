import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormKeyboardScroll } from '@/components/ui/FormKeyboardScroll';
import { ScreenLoading } from '@/components/ui/ScreenLoading';
import { TextField } from '@/components/ui/TextField';
import { AuthMethods } from '@/constants/auth';
import {
  AttendanceStatuses,
  FaceDetectionStatuses,
  FaceVerificationStatuses,
  GeofenceStatuses,
  SyncStatuses,
} from '@/constants/status';
import type { Employee } from '@/features/employees/types';
import type { Office } from '@/features/offices/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';
import {
  localDateInputValue,
  localDateTimeToUtcIso,
  localTimeInputValue,
} from '@/utils/datetime';
import { createId } from '@/utils/uuid';

type Mode = 'check_in' | 'check_out' | 'pair';

export default function ForgotPunchScreen() {
  const theme = useAppTheme();
  const services = useServices();
  const company = useAppStore((s) => s.company);
  const settings = useAppStore((s) => s.settings);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [officeId, setOfficeId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('pair');
  const [dateStr, setDateStr] = useState(localDateInputValue());
  const [inTime, setInTime] = useState('09:00');
  const [outTime, setOutTime] = useState(localTimeInputValue());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [peopleReady, setPeopleReady] = useState(false);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    void services.employees.listByCompany(company.id).then((list) => {
      if (cancelled) return;
      setEmployees(list);
      if (list[0]) setEmployeeId(list[0].id);
      setPeopleReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [company, services.employees]);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    void services.employees.listOffices(employeeId).then((list) => {
      if (cancelled) return;
      setOffices(list);
      setOfficeId(list[0]?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, services.employees]);

  if (!settings?.adminModeEnabled) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Unlock admin first</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  if (company && !peopleReady) {
    return <ScreenLoading variant="list" message="Loading people…" listCount={4} />;
  }

  const save = async () => {
    if (!employeeId || !officeId) {
      Alert.alert('Missing', 'Pick an employee and a location.');
      return;
    }
    const trimmed = note.trim();
    if (trimmed.length < 3) {
      Alert.alert('Note required', 'Add a short reason (e.g. forgot to check out).');
      return;
    }

    const inIso =
      mode === 'check_out' ? null : localDateTimeToUtcIso(dateStr, inTime);
    const outIso =
      mode === 'check_in' ? null : localDateTimeToUtcIso(dateStr, outTime);

    if (mode !== 'check_out' && !inIso) {
      Alert.alert('Invalid time', 'Use date YYYY-MM-DD and time HH:mm for check-in.');
      return;
    }
    if (mode !== 'check_in' && !outIso) {
      Alert.alert('Invalid time', 'Use date YYYY-MM-DD and time HH:mm for check-out.');
      return;
    }
    if (mode === 'pair' && inIso && outIso && outIso <= inIso) {
      Alert.alert('Invalid range', 'Check-out must be after check-in.');
      return;
    }

    if (mode === 'check_out') {
      const open = await services.attendance.getOpenCheckIn(employeeId);
      if (!open) {
        Alert.alert(
          'No open check-in',
          'This person has no open session. Use “Full pair” or “Check-in only”.'
        );
        return;
      }
    }

    setBusy(true);
    try {
      const adminNote = `Admin correction: ${trimmed}`;
      if (mode === 'check_out') {
        const open = await services.attendance.getOpenCheckIn(employeeId);
        if (!open) throw new Error('Open check-in disappeared.');
        await services.attendance.updateCheckout(open.id, {
          checkOutAt: outIso,
          checkOutLocationLabel: 'Manual admin correction',
          identityMethod: AuthMethods.MANUAL,
          geofenceStatus: GeofenceStatuses.NOT_CHECKED,
          attendanceStatus: AttendanceStatuses.LOCALLY_ACCEPTED,
          locationValidationMessage: adminNote,
          faceDetectionStatus: FaceDetectionStatuses.NOT_CHECKED,
          faceVerificationStatus: FaceVerificationStatuses.NOT_CHECKED,
          syncStatus: SyncStatuses.PENDING_SYNC,
        });
      } else {
        await services.attendance.create({
          id: createId(),
          employeeId,
          officeId,
          checkInAt: inIso,
          checkOutAt: mode === 'pair' ? outIso : null,
          checkInLatitude: null,
          checkInLongitude: null,
          checkInAccuracyMeters: null,
          checkInDistanceMeters: null,
          checkOutLatitude: null,
          checkOutLongitude: null,
          checkOutAccuracyMeters: null,
          checkOutDistanceMeters: null,
          faceDetectionStatus: FaceDetectionStatuses.NOT_CHECKED,
          faceVerificationStatus: FaceVerificationStatuses.NOT_CHECKED,
          biometricGateStatus: null,
          identityMethod: AuthMethods.MANUAL,
          geofenceStatus: GeofenceStatuses.NOT_CHECKED,
          attendanceStatus: AttendanceStatuses.LOCALLY_ACCEPTED,
          rejectionReason: null,
          syncStatus: SyncStatuses.PENDING_SYNC,
          locationPermissionStatus: null,
          locationValidationMessage: adminNote,
          checkInLocationLabel: 'Manual admin correction',
          checkOutLocationLabel: mode === 'pair' ? 'Manual admin correction' : null,
        });
      }
      Alert.alert('Saved', 'Forgot punch recorded.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not save correction.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormKeyboardScroll
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>
        Fix a missed punch. GPS is not required — add a short note for the audit trail.
      </Text>

      <Text style={[styles.label, { color: theme.text }]}>Employee</Text>
      <View style={styles.chips}>
        {employees.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => setEmployeeId(e.id)}
            style={[
              styles.chip,
              {
                backgroundColor: employeeId === e.id ? theme.brand : theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={{ color: employeeId === e.id ? '#fff' : theme.text, fontWeight: '600' }}>
              {e.fullName}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.text }]}>Location</Text>
      <View style={styles.chips}>
        {offices.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => setOfficeId(o.id)}
            style={[
              styles.chip,
              {
                backgroundColor: officeId === o.id ? theme.brand : theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={{ color: officeId === o.id ? '#fff' : theme.text, fontWeight: '600' }}>
              {o.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {offices.length === 0 ? (
        <Text style={{ color: theme.warning }}>Assign a location to this employee first.</Text>
      ) : null}

      <Text style={[styles.label, { color: theme.text }]}>What to add</Text>
      <View style={styles.chips}>
        {(
          [
            ['pair', 'Full pair'],
            ['check_in', 'Check-in only'],
            ['check_out', 'Check-out only'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setMode(key)}
            style={[
              styles.chip,
              {
                backgroundColor: mode === key ? theme.brand : theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={{ color: mode === key ? '#fff' : theme.text, fontWeight: '600' }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextField label="Date (YYYY-MM-DD)" value={dateStr} onChangeText={setDateStr} />
      {mode !== 'check_out' ? (
        <TextField label="Check-in time (HH:mm)" value={inTime} onChangeText={setInTime} />
      ) : null}
      {mode !== 'check_in' ? (
        <TextField label="Check-out time (HH:mm)" value={outTime} onChangeText={setOutTime} />
      ) : null}
      <TextField
        label="Note (required)"
        value={note}
        onChangeText={setNote}
        placeholder="Forgot to check out after meeting"
      />

      <Button title="Save correction" loading={busy} onPress={save} />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </FormKeyboardScroll>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

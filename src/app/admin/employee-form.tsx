import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormKeyboardScroll } from '@/components/ui/FormKeyboardScroll';
import { TextField } from '@/components/ui/TextField';
import { EMPLOYEE_PIN_LENGTH, isValidEmployeePin } from '@/constants/pin';
import {
  employeeProfileSchema,
  type EmployeeProfileInput,
} from '@/features/employees/schemas/employeeSchema';
import type { Office } from '@/features/offices/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';
import { href } from '@/utils/navigation';

function paramId(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw || undefined;
}

export default function EmployeeFormScreen() {
  const theme = useAppTheme();
  const services = useServices();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = useMemo(() => paramId(params.id), [params.id]);
  const company = useAppStore((s) => s.company);
  const setEmployees = useAppStore((s) => s.setEmployees);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([]);
  const [profileUri, setProfileUri] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeProfileInput>({
    resolver: zodResolver(employeeProfileSchema),
    defaultValues: {
      employeeCode: '',
      fullName: '',
      department: '',
      designation: '',
      email: '',
    },
  });

  useEffect(() => {
    if (!company) return;
    void services.offices.listByCompany(company.id).then((list) => {
      setOffices(list);
      if (!id && list.length === 1) {
        setSelectedOfficeIds([list[0].id]);
      }
    });
  }, [company, id, services.offices]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const emp = await services.employees.getById(id);
      if (!emp) return;
      reset({
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        department: emp.department ?? '',
        designation: emp.designation ?? '',
        email: emp.email ?? '',
      });
      setHasPin(!!emp.pinHash);
      setProfileUri(emp.profileImagePath);
      setSelectedOfficeIds(await services.employees.listOfficeIds(id));
    })();
  }, [id, reset, services.employees]);

  // After face enroll, refresh avatar (capture becomes profile picture).
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void services.employees.getById(id).then((emp) => {
        if (emp?.profileImagePath) setProfileUri(emp.profileImagePath);
      });
    }, [id, services.employees])
  );

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setProfileUri(result.assets[0].uri);
  };

  const toggleOffice = (officeId: string) => {
    setSelectedOfficeIds((prev) =>
      prev.includes(officeId) ? prev.filter((x) => x !== officeId) : [...prev, officeId]
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!company) {
      Alert.alert('No company', 'Finish company setup before adding employees.');
      return;
    }
    if (selectedOfficeIds.length === 0) {
      Alert.alert(
        'Locations required',
        'Assign at least one company location. Employees can only punch at assigned sites.'
      );
      return;
    }

    const trimmedPin = pin.trim();
    if (!id && !trimmedPin) {
      Alert.alert('PIN required', `New employees need a ${EMPLOYEE_PIN_LENGTH}-digit PIN.`);
      return;
    }
    if (trimmedPin && !isValidEmployeePin(trimmedPin)) {
      Alert.alert('Invalid PIN', `PIN must be exactly ${EMPLOYEE_PIN_LENGTH} digits.`);
      return;
    }

    setBusy(true);
    try {
      let employeeId = id;
      if (id) {
        await services.employees.update(id, values);
        if (trimmedPin) {
          await services.employees.setPin(id, trimmedPin);
          setHasPin(true);
        }
      } else {
        const created = await services.employees.create({
          ...values,
          companyId: company.id,
          pin: trimmedPin,
        });
        employeeId = created.id;
        setHasPin(true);
      }

      if (employeeId) {
        await services.employees.setOfficeIds(employeeId, selectedOfficeIds);
        if (profileUri) {
          const existing = id ? (await services.employees.getById(id))?.profileImagePath : null;
          if (profileUri !== existing) {
            const saved = await services.images.savePrivateImage(profileUri, 'profile');
            await services.employees.setProfileImage(employeeId, saved);
            setProfileUri(saved);
          }
        }
      }

      setEmployees(await services.employees.listByCompany(company.id));
      Alert.alert('Saved', 'Employee, PIN, locations, and photo saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert(
        'Save failed',
        e instanceof Error
          ? e.message
          : 'Could not save employee. If this persists, clear app data and re-open (schema repair).'
      );
    } finally {
      setBusy(false);
    }
  });

  return (
    <FormKeyboardScroll
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <Pressable style={styles.photoRow} onPress={pickPhoto}>
        {profileUri ? (
          <Image source={{ uri: profileUri }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, { backgroundColor: theme.brandSoft }]}>
            <Text style={{ color: theme.brand, fontWeight: '800', fontSize: 22 }}>
              {(company?.name ?? 'E').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: theme.text, fontWeight: '700' }}>Profile photo</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
            Shows on the left of kiosk & admin lists. Tap to choose.
          </Text>
        </View>
      </Pressable>

      {(
        [
          ['employeeCode', 'Employee code', false],
          ['fullName', 'Full name', false],
          ['department', 'Department', false],
          ['designation', 'Designation', false],
          ['email', 'Email', true],
        ] as const
      ).map(([name, label, isEmail]) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label={label}
              email={isEmail}
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors[name]?.message}
            />
          )}
        />
      ))}

      <TextField
        label={
          id
            ? hasPin
              ? `Replace PIN (${EMPLOYEE_PIN_LENGTH} digits)`
              : `Set PIN (${EMPLOYEE_PIN_LENGTH} digits)`
            : `PIN (${EMPLOYEE_PIN_LENGTH} digits)`
        }
        value={pin}
        onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, EMPLOYEE_PIN_LENGTH))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={EMPLOYEE_PIN_LENGTH}
      />
      {id ? (
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
          PIN status: {hasPin ? 'saved' : 'missing'}
        </Text>
      ) : null}

      <Text style={[styles.section, { color: theme.text }]}>Assigned locations</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
        Employee can check in/out only when GPS is inside one of these sites.
      </Text>
      {offices.length === 0 ? (
        <Text style={{ color: theme.warning }}>
          No locations yet. Add them under Admin → Locations first.
        </Text>
      ) : (
        offices.map((office) => (
          <Pressable key={office.id} style={styles.row} onPress={() => toggleOffice(office.id)}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '600' }}>{office.name}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {office.latitude.toFixed(4)}, {office.longitude.toFixed(4)} · {office.radiusMeters}m
              </Text>
            </View>
            <Switch
              value={selectedOfficeIds.includes(office.id)}
              onValueChange={() => toggleOffice(office.id)}
            />
          </Pressable>
        ))
      )}
      {offices.length > 1 ? (
        <Button
          title="Select all locations"
          variant="ghost"
          onPress={() => setSelectedOfficeIds(offices.map((o) => o.id))}
        />
      ) : null}

      <Button title="Save employee" loading={busy} onPress={onSubmit} />
      {id ? (
        <Button
          title="Enroll / replace face (optional)"
          variant="secondary"
          onPress={() => router.push(href(`/admin/face-enroll?id=${id}`))}
        />
      ) : null}
      <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>
        Face enroll also sets the profile picture from the capture.
      </Text>
    </FormKeyboardScroll>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  section: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
  },
});

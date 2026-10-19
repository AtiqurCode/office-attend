import { zodResolver } from '@hookform/resolvers/zod';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormKeyboardScroll } from '@/components/ui/FormKeyboardScroll';
import { SkeletonList } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import {
  officeSchema,
  type OfficeFormValues,
  type OfficeInput,
} from '@/features/offices/schemas/officeSchema';
import type { Office } from '@/features/offices/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';

export default function AdminLocationsScreen() {
  const theme = useAppTheme();
  const services = useServices();
  const company = useAppStore((s) => s.company);
  const settings = useAppStore((s) => s.settings);
  const setOffice = useAppStore((s) => s.setOffice);
  const setSettings = useAppStore((s) => s.setSettings);
  const [offices, setOffices] = useState<Office[]>([]);
  const [editing, setEditing] = useState<Office | null>(null);
  const [creating, setCreating] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsHint, setGpsHint] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!company) {
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      setOffices(await services.offices.listByCompany(company.id));
    } finally {
      setListLoading(false);
    }
  }, [company, services.offices]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OfficeFormValues, unknown, OfficeInput>({
    resolver: zodResolver(officeSchema),
    defaultValues: {
      name: '',
      latitude: 0,
      longitude: 0,
      radiusMeters: 200,
      maxLocationAccuracyMeters: 50,
      address: '',
      notes: '',
      isActive: true,
    },
  });

  const latitude = useWatch({ control, name: 'latitude' });
  const longitude = useWatch({ control, name: 'longitude' });

  const fillFromGps = async () => {
    setGpsBusy(true);
    setGpsHint(null);
    try {
      const pos = await services.location.getCurrentPosition();
      setValue('latitude', Number(pos.latitude.toFixed(6)), {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('longitude', Number(pos.longitude.toFixed(6)), {
        shouldDirty: true,
        shouldValidate: true,
      });
      const acc =
        pos.accuracyMeters != null ? `±${Math.round(pos.accuracyMeters)} m` : 'accuracy unknown';
      setGpsHint(`Filled from this device GPS (${acc}). Stand at the site center for best results.`);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Could not read GPS. Allow location permission and try outdoors.';
      setGpsHint(msg);
      Alert.alert('GPS unavailable', msg);
    } finally {
      setGpsBusy(false);
    }
  };

  if (!settings?.adminModeEnabled || !company) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Unlock admin first</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setGpsHint(null);
    reset({
      name: 'New location',
      latitude: 0,
      longitude: 0,
      radiusMeters: 200,
      maxLocationAccuracyMeters: 50,
      address: '',
      notes: '',
      isActive: true,
    });
    // Auto-collect GPS when adding a site (stand at the entrance / center).
    void fillFromGps();
  };

  const startEdit = (office: Office) => {
    setEditing(office);
    setCreating(false);
    setGpsHint(null);
    reset({
      name: office.name,
      latitude: office.latitude,
      longitude: office.longitude,
      radiusMeters: office.radiusMeters,
      maxLocationAccuracyMeters: office.maxLocationAccuracyMeters,
      address: office.address ?? '',
      notes: office.notes ?? '',
      isActive: office.isActive,
    });
  };

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        if (editing) {
          const updated = await services.offices.update(editing.id, values);
          if (settings.selectedOfficeId === updated.id) setOffice(updated);
        } else {
          await services.offices.create({ ...values, companyId: company.id });
        }
        setCreating(false);
        setEditing(null);
        setGpsHint(null);
        await reload();
        Alert.alert('Saved', 'Location saved.');
      } catch (e) {
        Alert.alert('Save failed', e instanceof Error ? e.message : 'Could not save location.');
      }
    },
    () => {
      Alert.alert('Check the form', 'Fix highlighted fields (name, coordinates, radius) then save.');
    }
  );

  const selectActive = async (office: Office) => {
    setOffice(office);
    setSettings(await services.settings.updateMany({ selectedOfficeId: office.id }));
  };

  if (creating || editing) {
    return (
      <FormKeyboardScroll
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.formScroll}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          {editing ? 'Edit location' : 'New location'}
        </Text>
        <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>
          Stand at the site center and use GPS, or type coordinates manually.
        </Text>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Name"
              value={String(value ?? '')}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.name?.message}
            />
          )}
        />

        <View
          style={[styles.gpsBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={{ color: theme.text, fontWeight: '600' }}>Coordinates</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
            Lat {Number(latitude || 0).toFixed(6)} · Lng {Number(longitude || 0).toFixed(6)}
          </Text>
          <Button
            title={gpsBusy ? 'Reading GPS…' : 'Use current GPS'}
            variant="secondary"
            loading={gpsBusy}
            onPress={fillFromGps}
          />
          {gpsHint ? (
            <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>
              {gpsHint}
            </Text>
          ) : null}
        </View>

        {(
          [
            ['latitude', 'Latitude', true],
            ['longitude', 'Longitude', true],
            ['radiusMeters', 'Radius (m)', true],
            ['maxLocationAccuracyMeters', 'Max accuracy (m)', true],
            ['address', 'Address', false],
          ] as const
        ).map(([name, label, numeric]) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label={label}
                value={String(value ?? '')}
                onBlur={onBlur}
                onChangeText={onChange}
                keyboardType={numeric ? 'decimal-pad' : 'default'}
                error={errors[name]?.message as string | undefined}
              />
            )}
          />
        ))}
        <Controller
          control={control}
          name="isActive"
          render={({ field: { value, onChange } }) => (
            <View style={styles.switchRow}>
              <Text style={{ color: theme.text }}>Active</Text>
              <Switch value={Boolean(value)} onValueChange={onChange} />
            </View>
          )}
        />

        <Button title="Save location" loading={isSubmitting} onPress={onSubmit} />
        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => {
            setCreating(false);
            setEditing(null);
            setGpsHint(null);
          }}
        />
      </FormKeyboardScroll>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, padding: 16 }]}>
      <Button title="Add location" onPress={startCreate} />
      <FlatList
        style={styles.flex}
        data={offices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingTop: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          listLoading ? (
            <SkeletonList count={4} lines={3} />
          ) : (
            <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 24 }}>
              No sites yet. Add one and use GPS at the location.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => startEdit(item)}
            onLongPress={() => void selectActive(item)}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontWeight: '700' }}>{item.name}</Text>
            <Text style={{ color: theme.textSecondary }}>
              {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} · {item.radiusMeters} m
            </Text>
            <Text style={{ color: theme.brand, fontSize: 12 }}>
              {settings.selectedOfficeId === item.id
                ? 'Active punch site'
                : 'Tap to edit · long-press to select'}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  formScroll: {
    padding: 16,
    gap: 12,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  gpsBox: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

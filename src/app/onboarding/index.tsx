import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormKeyboardScroll } from '@/components/ui/FormKeyboardScroll';
import { TextField } from '@/components/ui/TextField';
import { AuthMethods, type AuthMethod } from '@/constants/auth';
import { APP_NAME } from '@/constants/config';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';
import { href } from '@/utils/navigation';

export default function CompanyOnboardingScreen() {
  const theme = useAppTheme();
  const services = useServices();
  const authUser = useAppStore((s) => s.authUser);
  const existingCompany = useAppStore((s) => s.company);
  const setCompany = useAppStore((s) => s.setCompany);
  const setOffice = useAppStore((s) => s.setOffice);
  const setSettings = useAppStore((s) => s.setSettings);
  const setEmployees = useAppStore((s) => s.setEmployees);

  const defaultName =
    existingCompany?.name ||
    authUser?.displayName ||
    authUser?.email?.split('@')[0] ||
    'My Company';

  const [companyName, setCompanyName] = useState(defaultName);
  const [locationName, setLocationName] = useState('Main Office');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [spotReady, setSpotReady] = useState(false);
  const [methods, setMethods] = useState<AuthMethod[]>([
    AuthMethods.PIN,
    AuthMethods.FACE,
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMethod = (method: AuthMethod) => {
    setMethods((prev) => {
      if (prev.includes(method)) {
        const next = prev.filter((m) => m !== method);
        return next.length ? next : [AuthMethods.PIN];
      }
      return [...prev, method];
    });
  };

  const captureSpot = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const pos = await services.location.getCurrentPosition();
      setLatitude(String(pos.latitude));
      setLongitude(String(pos.longitude));
      setSpotReady(true);
      setError(null);
      return { lat: pos.latitude, lng: pos.longitude };
    } catch {
      setSpotReady(false);
      setError('Could not read this phone’s location. Stand near a window and try again.');
      return null;
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      let lat = Number(latitude);
      let lng = Number(longitude);
      if (!companyName.trim()) {
        setError('Enter the company name.');
        return;
      }
      if (!spotReady || Number.isNaN(lat) || Number.isNaN(lng)) {
        const spot = await captureSpot();
        if (!spot) return;
        lat = spot.lat;
        lng = spot.lng;
      }
      const rad = 200;

      const existing = await services.companies.getPrimary();
      const company = existing
        ? await services.companies.update(existing.id, {
            name: companyName,
            enabledAuthMethods: methods,
          })
        : await services.companies.create({
            name: companyName,
            enabledAuthMethods: methods,
          });

      const office =
        (await services.offices.getDefault(company.id)) ??
        (await services.offices.create({
          companyId: company.id,
          name: locationName.trim() || 'Main Office',
          latitude: lat,
          longitude: lng,
          radiusMeters: Math.round(rad),
          maxLocationAccuracyMeters: 50,
          address: '',
          notes: 'Configured during kiosk setup',
          isActive: true,
        }));

      if (await services.offices.getDefault(company.id)) {
        await services.offices.update(office.id, {
          name: locationName.trim() || office.name,
          latitude: lat,
          longitude: lng,
          radiusMeters: Math.round(rad),
          maxLocationAccuracyMeters: office.maxLocationAccuracyMeters,
          address: office.address ?? '',
          notes: office.notes ?? '',
          isActive: true,
        });
      }

      const settings = await services.settings.updateMany({
        onboardingCompleted: true,
        selectedOfficeId: office.id,
        privacyConsentAt: new Date().toISOString(),
      });

      setCompany(company);
      setOffice(await services.offices.getById(office.id));
      setEmployees(await services.employees.listByCompany(company.id));
      setSettings(settings);
      router.replace(href('/(tabs)/home'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormKeyboardScroll
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.brand, { color: theme.brand }]}>{APP_NAME}</Text>
      <Text style={[styles.title, { color: theme.text }]}>Set up this workplace</Text>
      <Text style={{ color: theme.textSecondary, lineHeight: 22 }}>
        {authUser
          ? 'Confirm the company name, then mark this phone’s spot as the first site.'
          : 'Name the workplace and mark where people punch. Radius can be changed later under Sites.'}
      </Text>

      <TextField label="Company name" value={companyName} onChangeText={setCompanyName} />
      <TextField label="Site name" value={locationName} onChangeText={setLocationName} />
      <Button title="Use this spot" variant="secondary" onPress={() => void captureSpot()} />
      <Text style={{ color: spotReady ? theme.brand : theme.textSecondary, fontSize: 14 }}>
        {spotReady ? 'This spot is set. You can change it later under Sites.' : 'Location not set yet.'}
      </Text>

      <Text style={[styles.section, { color: theme.text }]}>Identity (pick one at kiosk)</Text>
      {(
        [
          [AuthMethods.PIN, 'PIN'],
          [AuthMethods.FACE, 'Photo capture'],
        ] as const
      ).map(([key, label]) => (
        <Pressable key={key} style={styles.row} onPress={() => toggleMethod(key)}>
          <Text style={{ color: theme.text, flex: 1 }}>{label}</Text>
          <Switch value={methods.includes(key)} onValueChange={() => toggleMethod(key)} />
        </Pressable>
      ))}
      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
        User chooses PIN or photo — either auto check-in/out. Photo is evidence only (no face match).
      </Text>

      {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
      <Button title="Finish setup" loading={busy} onPress={submit} />
    </FormKeyboardScroll>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  brand: { fontSize: 28, fontWeight: '800' },
  title: { fontSize: 20, fontWeight: '700' },
  section: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
});

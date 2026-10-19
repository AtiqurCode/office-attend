import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormKeyboardScroll } from '@/components/ui/FormKeyboardScroll';
import { signOutAccount } from '@/firebase/authAccount';
import { isFirebaseConfigured } from '@/firebase/config';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';
import { href } from '@/utils/navigation';

export default function AdminTabScreen() {
  const theme = useAppTheme();
  const services = useServices();
  const settings = useAppStore((s) => s.settings);
  const authUser = useAppStore((s) => s.authUser);
  const company = useAppStore((s) => s.company);
  const office = useAppStore((s) => s.office);
  const setSettings = useAppStore((s) => s.setSettings);
  const setAuthUser = useAppStore((s) => s.setAuthUser);
  const setCompany = useAppStore((s) => s.setCompany);
  const setEmployees = useAppStore((s) => s.setEmployees);
  const setOffice = useAppStore((s) => s.setOffice);
  const [adminPin, setAdminPin] = useState('');
  const firebase = isFirebaseConfigured();

  if (!settings) return null;

  const unlock = async () => {
    const ok = await services.settings.verifyAdminPin(adminPin.trim() || '1234');
    if (!ok) {
      Alert.alert('Wrong PIN', 'Try again, or ask the person who set up this device.');
      return;
    }
    const next = await services.settings.updateMany({ adminModeEnabled: true });
    setSettings(next);
  };

  const wipe = () => {
    Alert.alert('Erase this device?', 'Removes company, people, punches, and photos.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase',
        style: 'destructive',
        onPress: async () => {
          await services.eraseDeviceData();
          if (firebase) {
            try {
              await signOutAccount();
            } catch {
              // ignore
            }
            setAuthUser(null);
          }
          setCompany(null);
          setEmployees([]);
          setOffice(null);
          setSettings(await services.settings.getSettings());
          router.replace(href(firebase ? '/auth' : '/onboarding'));
        },
      },
    ]);
  };

  const signOut = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to manage this company.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOutAccount();
          setAuthUser(null);
          setCompany(null);
          setEmployees([]);
          setOffice(null);
          router.replace(href('/auth'));
        },
      },
    ]);
  };

  return (
    <FormKeyboardScroll
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: theme.text }]}>Manage</Text>
      <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>
        {company?.name ?? 'No company'}
        {office ? ` · ${office.name}` : ''}
        {services.backend === 'firebase' ? ' · Firestore' : ' · Local SQLite (Firebase env missing)'}
      </Text>
      {authUser?.email ? (
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
          Signed in as {authUser.displayName || authUser.email}
        </Text>
      ) : null}

      {!settings.adminModeEnabled ? (
        <View style={[styles.lockCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.lockTitle, { color: theme.text }]}>Staff only</Text>
          <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>
            Unlock to add people, sites, fix missed punches, and export reports. The Punch tab stays
            open for everyone.
          </Text>
          <TextInput
            value={adminPin}
            onChangeText={setAdminPin}
            secureTextEntry
            placeholder="Admin PIN"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
            ]}
          />
          <Button title="Unlock" onPress={unlock} />
        </View>
      ) : (
        <>
          <Section title="People & sites" theme={theme}>
            <Row label="People" hint="PIN, photo, assigned sites" onPress={() => router.push(href('/admin/employees'))} theme={theme} />
            <Row
              label="Bulk upload / download"
              hint="Excel sheet — import & export people"
              onPress={() => router.push(href('/admin/employees-bulk'))}
              theme={theme}
            />
            <Row label="Sites" hint="GPS locations" onPress={() => router.push(href('/admin/locations'))} theme={theme} />
            <Row label="Company" hint="Name & punch methods" onPress={() => router.push(href('/admin/company'))} theme={theme} />
          </Section>

          <Section title="Attendance" theme={theme}>
            <Row
              label="Fix a missed punch"
              hint="Manual in / out with a note"
              onPress={() => router.push(href('/admin/forgot-punch'))}
              theme={theme}
            />
            <Row
              label="Reports & export"
              hint="Day, week, month, year → CSV"
              onPress={() => router.push(href('/admin/reports'))}
              theme={theme}
            />
          </Section>

          <Section title="Device" theme={theme}>
            <Row label="Privacy" onPress={() => router.push(href('/settings/privacy'))} theme={theme} />
          </Section>

          <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>
            Tip: add sites → assign them on each person → pick the site on Punch before people arrive.
          </Text>

          <Button
            title="Lock manage mode"
            variant="secondary"
            onPress={async () =>
              setSettings(await services.settings.updateMany({ adminModeEnabled: false }))
            }
          />
          {firebase ? (
            <Button title="Sign out" variant="secondary" onPress={signOut} />
          ) : null}
          <Button title="Erase this device" variant="danger" onPress={wipe} />
        </>
      )}

      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
        {Constants.expoConfig?.name} v{Constants.expoConfig?.version}
      </Text>
    </FormKeyboardScroll>
  );
}

function Section({
  title,
  children,
  theme,
}: {
  title: string;
  children: ReactNode;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.section, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  hint,
  onPress,
  theme,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontWeight: '600', fontSize: 16 }}>{label}</Text>
        {hint ? (
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{hint}</Text>
        ) : null}
      </View>
      <Text style={{ color: theme.textSecondary, fontSize: 20 }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700' },
  lockCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  lockTitle: { fontSize: 18, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: 12, fontSize: 16 },
  section: { fontSize: 13, fontWeight: '600' },
  group: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000014',
  },
});

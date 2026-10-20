import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormKeyboardScroll } from '@/components/ui/FormKeyboardScroll';
import { TextField } from '@/components/ui/TextField';
import { APP_NAME } from '@/constants/config';
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
          router.replace(href('/auth?mode=login'));
        },
      },
    ]);
  };

  return (
    <FormKeyboardScroll
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.eyebrow, { color: theme.brand }]}>{APP_NAME}</Text>
      <Text style={[styles.title, { color: theme.text }]}>Manage</Text>
      <Text style={{ color: theme.textSecondary, lineHeight: 21, fontSize: 15 }}>
        {company?.name ?? 'No company'}
        {office ? ` · ${office.name}` : ''}
      </Text>
      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
        {services.backend === 'firebase' ? 'Cloud · Firestore' : 'Local · SQLite (Firebase env missing)'}
        {authUser?.email ? ` · ${authUser.displayName || authUser.email}` : ''}
      </Text>

      {!settings.adminModeEnabled ? (
        <View style={[styles.lockCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.lockTitle, { color: theme.text }]}>Staff only</Text>
          <Text style={{ color: theme.textSecondary, lineHeight: 21 }}>
            Unlock to add people, sites, fix missed punches, and export reports. The Punch tab stays
            open for everyone.
          </Text>
          <TextField
            label="Admin PIN"
            value={adminPin}
            onChangeText={setAdminPin}
            secureTextEntry
            placeholder="••••"
            keyboardType="number-pad"
            textContentType="password"
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
  container: { padding: 16, gap: 14, paddingBottom: 40 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
  lockCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  lockTitle: { fontSize: 18, fontWeight: '800' },
  section: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  group: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000014',
  },
});

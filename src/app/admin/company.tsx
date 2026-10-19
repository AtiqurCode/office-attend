import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormKeyboardScroll } from '@/components/ui/FormKeyboardScroll';
import { TextField } from '@/components/ui/TextField';
import { AuthMethods, type AuthMethod } from '@/constants/auth';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';

export default function AdminCompanyScreen() {
  const theme = useAppTheme();
  const services = useServices();
  const company = useAppStore((s) => s.company);
  const settings = useAppStore((s) => s.settings);
  const setCompany = useAppStore((s) => s.setCompany);
  const [name, setName] = useState(company?.name ?? '');
  const [methods, setMethods] = useState<AuthMethod[]>(
    company?.enabledAuthMethods ?? [AuthMethods.PIN]
  );
  const [busy, setBusy] = useState(false);

  if (!settings?.adminModeEnabled || !company) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Unlock admin first</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const toggle = (method: AuthMethod) => {
    setMethods((prev) => {
      if (prev.includes(method)) {
        const next = prev.filter((m) => m !== method);
        return next.length ? next : [AuthMethods.PIN];
      }
      return [...prev, method];
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      const updated = await services.companies.update(company.id, {
        name,
        enabledAuthMethods: methods,
      });
      setCompany(updated);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormKeyboardScroll
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <TextField label="Company name" value={name} onChangeText={setName} />
      <Text style={[styles.section, { color: theme.text }]}>Enabled identity methods</Text>
      {(
        [
          [AuthMethods.PIN, 'PIN'],
          [AuthMethods.FACE, 'Photo capture'],
        ] as const
      ).map(([key, label]) => (
        <Pressable key={key} style={styles.row} onPress={() => toggle(key)}>
          <Text style={{ color: theme.text, flex: 1 }}>{label}</Text>
          <Switch value={methods.includes(key)} onValueChange={() => toggle(key)} />
        </Pressable>
      ))}
      <Text style={{ color: theme.warning, fontSize: 12 }}>
        Kiosk: pick PIN or photo (not both). Either auto check-in/out. Photo is saved as evidence —
        no face matching. Eye check disabled.
      </Text>
      <Button title="Save" loading={busy} onPress={save} />
    </FormKeyboardScroll>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  section: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
});

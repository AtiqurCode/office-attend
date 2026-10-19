import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthMethods } from '@/constants/auth';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAppStore } from '@/store/appStore';
import { formatDistance } from '@/utils/geo';
import { href, paramString } from '@/utils/navigation';

export default function KioskResultScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{
    ok: string;
    employeeId?: string | string[];
    method?: string | string[];
    title: string;
    message: string;
    name: string;
    lat: string;
    lng: string;
    acc: string;
    dist: string;
  }>();

  const selectedEmployee = useAppStore((s) => s.selectedEmployee);
  const ok = paramString(params.ok) === '1';
  const employeeId = paramString(params.employeeId) || selectedEmployee?.id || '';
  const method = paramString(params.method) || AuthMethods.PIN;

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => router.replace(href('/(tabs)/home')), 2800);
    return () => clearTimeout(t);
  }, [ok]);

  const retrySamePerson = () => {
    if (!employeeId) {
      router.replace(href('/(tabs)/home'));
      return;
    }
    // Stay in the punch flow — reopen PIN/photo for the same person.
    router.replace({
      pathname: '/kiosk/verify',
      params: {
        employeeId,
        action: 'auto',
        method,
      },
    });
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: ok ? theme.brandSoft : theme.dangerSoft },
      ]}
    >
      <View style={styles.main}>
        <Text style={[styles.status, { color: ok ? theme.brand : theme.danger }]}>
          {ok ? 'Done' : 'Not saved'}
        </Text>
        <Text style={[styles.title, { color: theme.text }]}>{params.title}</Text>
        <Text style={[styles.name, { color: theme.text }]}>{params.name || '—'}</Text>
        <Text style={[styles.message, { color: theme.textSecondary }]}>{params.message}</Text>
        {!ok ? (
          <Text style={[styles.retryHint, { color: theme.text }]}>
            Tap Try again to go back to PIN / photo for this person.
          </Text>
        ) : null}
      </View>

      <View style={[styles.meta, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <MetaRow
          label="How"
          value={method === 'manual' ? 'Admin fix' : method || '—'}
          theme={theme}
        />
        <MetaRow
          label="GPS"
          value={
            params.lat && params.lng
              ? `${Number(params.lat).toFixed(5)}, ${Number(params.lng).toFixed(5)}`
              : '—'
          }
          theme={theme}
        />
        <MetaRow
          label="Accuracy"
          value={
            params.acc
              ? `±${Math.round(Number(params.acc))} m · ${formatDistance(params.dist ? Number(params.dist) : null)}`
              : '—'
          }
          theme={theme}
        />
      </View>

      {ok ? (
        <Button title="Next person" onPress={() => router.replace(href('/(tabs)/home'))} />
      ) : (
        <>
          <Button title="Try again" onPress={retrySamePerson} />
          <Button
            title="Back to list"
            variant="secondary"
            onPress={() => router.replace(href('/(tabs)/home'))}
          />
        </>
      )}
      {ok ? (
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Returning to the list in a moment…
        </Text>
      ) : null}
    </View>
  );
}

function MetaRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={{ color: theme.textSecondary, width: 72 }}>{label}</Text>
      <Text style={{ color: theme.text, fontWeight: '600', flex: 1 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  main: { gap: 8, alignItems: 'center' },
  status: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  name: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  message: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  retryHint: { fontSize: 14, textAlign: 'center', fontWeight: '600', marginTop: 4 },
  meta: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  metaRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  hint: { textAlign: 'center', fontSize: 13 },
});

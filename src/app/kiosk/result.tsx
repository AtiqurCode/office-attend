import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthMethods } from '@/constants/auth';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAppStore } from '@/store/appStore';
import { formatLocalTime } from '@/utils/datetime';
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
  const visibleMessage = resultMessage(paramString(params.message), paramString(params.name));

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
        <Text style={[styles.time, { color: theme.text }]}>{formatLocalTime(new Date().toISOString())}</Text>
        {visibleMessage ? (
          <Text style={[styles.message, { color: theme.textSecondary }]}>{visibleMessage}</Text>
        ) : null}
        {!ok ? (
          <Text style={[styles.retryHint, { color: theme.text }]}>
            Tap Try again to go back to PIN / photo for this person.
          </Text>
        ) : null}
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

/** Drop the coordinate dump. Keep rejection reasons. */
function resultMessage(message: string, name: string): string | null {
  const text = message.trim();
  if (!text) return null;
  const rest = name ? text.replace(name, '').replace(/^[\s·|,-]+/, '').trim() : text;
  if (!rest) return null;
  if (/-?\d+\.\d{3,}\s*,\s*-?\d+\.\d{3,}/.test(rest)) return null;
  return rest;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  main: { gap: 8, alignItems: 'center' },
  status: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  name: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  time: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  retryHint: { fontSize: 14, textAlign: 'center', fontWeight: '600', marginTop: 4 },
  hint: { textAlign: 'center', fontSize: 13 },
});

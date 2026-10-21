import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';
import { canManage } from '@/utils/access';
import {
  buildAttendanceCsv,
  buildAttendanceSummaryText,
} from '@/utils/attendanceExport';
import {
  formatLocalDateTime,
  localPeriodBoundsUtc,
  shiftPeriodAnchor,
  type ReportPeriod,
} from '@/utils/datetime';

const PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'biweek', label: '2 weeks' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export default function ReportsScreen() {
  const theme = useAppTheme();
  const services = useServices();
  const company = useAppStore((s) => s.company);
  const authUser = useAppStore((s) => s.authUser);
  const settings = useAppStore((s) => s.settings);
  const [period, setPeriod] = useState<ReportPeriod>('day');
  const [anchor, setAnchor] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<
    Awaited<ReturnType<typeof services.attendance.listForCompanyInRange>>
  >([]);

  const bounds = useMemo(() => localPeriodBoundsUtc(period, anchor), [period, anchor]);

  const load = useCallback(async () => {
    if (!company) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await services.attendance.listForCompanyInRange(
        company.id,
        bounds.startUtc,
        bounds.endUtc
      );
      setRecords(rows);
    } finally {
      setLoading(false);
    }
  }, [bounds.endUtc, bounds.startUtc, company, services.attendance]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!canManage(authUser, settings)) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Unlock admin first</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const completed = records.filter((r) => r.checkInAt && r.checkOutAt).length;
  const open = records.filter((r) => r.checkInAt && !r.checkOutAt).length;
  const people = new Set(records.map((r) => r.employeeId)).size;

  const shareFile = async (content: string, filename: string, mimeType: string) => {
    setBusy(true);
    try {
      const path = `${FileSystem.cacheDirectory ?? ''}${filename}`;
      await FileSystem.writeAsStringAsync(path, content, { encoding: 'utf8' });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Saved', `File written to cache:\n${path}`);
        return;
      }
      await Sharing.shareAsync(path, { mimeType, dialogTitle: filename });
    } catch (e) {
      Alert.alert('Share failed', e instanceof Error ? e.message : 'Could not share file.');
    } finally {
      setBusy(false);
    }
  };

  const onExportCsv = () => {
    const name = (company?.name ?? 'company').replace(/[^\w.-]+/g, '_');
    const body = buildAttendanceCsv(company?.name ?? 'Company', bounds.label, records);
    void shareFile(body, `attendance_${name}_${period}.csv`, 'text/csv');
  };

  const onShareSummary = () => {
    const name = (company?.name ?? 'company').replace(/[^\w.-]+/g, '_');
    const body = buildAttendanceSummaryText(company?.name ?? 'Company', bounds.label, records);
    void shareFile(body, `summary_${name}_${period}.txt`, 'text/plain');
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Reports & export</Text>
      <Text style={{ color: theme.textSecondary }}>
        Filter by day, week, 2 weeks, month, or year — then share CSV or a printable summary.
      </Text>

      <View style={styles.chips}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[
              styles.chip,
              {
                backgroundColor: period === p.key ? theme.brand : theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={{ color: period === p.key ? '#fff' : theme.text, fontWeight: '700' }}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.navRow}>
        <Button
          title="‹ Prev"
          variant="secondary"
          onPress={() => setAnchor((a) => shiftPeriodAnchor(period, a, -1))}
        />
        <Text style={[styles.periodLabel, { color: theme.text }]} numberOfLines={2}>
          {bounds.label}
        </Text>
        <Button
          title="Next ›"
          variant="secondary"
          onPress={() => setAnchor((a) => shiftPeriodAnchor(period, a, 1))}
        />
      </View>
      <Button title="Jump to today" variant="ghost" onPress={() => setAnchor(new Date())} />

      <Card style={{ gap: 6 }}>
        <Text style={{ color: theme.text, fontWeight: '700' }}>Summary</Text>
        <Text style={{ color: theme.textSecondary }}>
          {loading
            ? 'Loading period…'
            : `${records.length} punches · ${people} people · ${completed} completed · ${open} open`}
        </Text>
      </Card>

      <Button title="Share CSV" loading={busy || loading} onPress={onExportCsv} />
      <Button
        title="Share printable summary"
        variant="secondary"
        loading={busy || loading}
        onPress={onShareSummary}
      />

      <Text style={[styles.section, { color: theme.text }]}>Preview</Text>
      {loading ? (
        <SkeletonList count={4} lines={3} />
      ) : records.length === 0 ? (
        <Text style={{ color: theme.textSecondary }}>No records in this period.</Text>
      ) : (
        records.map((r) => (
          <Card key={r.id} style={{ gap: 4, marginBottom: 4 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>
              {r.employeeName} · {r.employeeCode}
            </Text>
            <Text style={{ color: theme.textSecondary }}>{r.officeName}</Text>
            <Text style={{ color: theme.text }}>
              In {formatLocalDateTime(r.checkInAt)} · Out {formatLocalDateTime(r.checkOutAt)}
            </Text>
            {r.identityMethod === 'manual' ? (
              <Text style={{ color: theme.warning, fontSize: 12 }}>
                {r.locationValidationMessage ?? 'Manual correction'}
              </Text>
            ) : null}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  periodLabel: { flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 15 },
  section: { fontSize: 16, fontWeight: '700', marginTop: 8 },
});

import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';
import { formatLocalTime, localDayBoundsUtc, todayLabel } from '@/utils/datetime';
import { href } from '@/utils/navigation';

export default function TodayBoardScreen() {
  const theme = useAppTheme();
  const services = useServices();
  const company = useAppStore((s) => s.company);
  const settings = useAppStore((s) => s.settings);
  const { startUtc, endUtc } = localDayBoundsUtc();

  const query = useQuery({
    queryKey: ['today-board', company?.id, startUtc],
    enabled: !!company,
    // Keep last result while refreshing so the board doesn't flash skeleton ↔ empty.
    placeholderData: (prev) => prev,
    queryFn: async () => {
      if (!company) return [];
      return services.attendance.listTodayForCompany(company.id, startUtc, endUtc);
    },
  });

  const refetch = query.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const records = query.data ?? [];
  const completed = records.filter((r) => r.checkInAt && r.checkOutAt).length;
  const open = records.filter((r) => r.checkInAt && !r.checkOutAt).length;
  // First load only — never treat a settled empty list as "loading" on tab focus.
  const showSkeleton = query.isPending && !query.isFetched;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.eyebrow, { color: theme.brand }]}>Attendance board</Text>
      <Text style={[styles.title, { color: theme.text }]}>Today</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 15 }}>{todayLabel()}</Text>

      <View style={styles.stats}>
        <Stat label="Punches" value={String(records.length)} theme={theme} />
        <Stat label="Complete" value={String(completed)} theme={theme} />
        <Stat label="Still in" value={String(open)} theme={theme} />
      </View>

      {settings?.adminModeEnabled ? (
        <Button
          title="Open reports"
          variant="secondary"
          onPress={() => router.push(href('/admin/reports'))}
        />
      ) : null}

      {showSkeleton ? (
        <SkeletonList count={3} lines={3} />
      ) : records.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No punches yet</Text>
          <Text style={[styles.empty, { color: theme.textSecondary }]}>
            People punch from the Punch tab. Today’s activity will show up here.
          </Text>
        </View>
      ) : (
        records.map((record) => (
          <Pressable
            key={record.id}
            onPress={() => router.push(href(`/attendance/${record.id}`))}
            style={({ pressed }) => [
              styles.rowCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            {record.profileImagePath ? (
              <Image source={{ uri: record.profileImagePath }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.brandSoft }]}>
                <Text style={{ color: theme.brand, fontWeight: '700' }}>
                  {(record.employeeName ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {record.employeeName ?? 'Employee'}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }} numberOfLines={1}>
                {record.employeeCode} · {record.officeName}
              </Text>
              <Text style={{ color: theme.text, fontSize: 14 }}>
                {formatLocalTime(record.checkInAt)}
                {record.checkOutAt ? ` → ${formatLocalTime(record.checkOutAt)}` : ' → still in'}
              </Text>
            </View>
            <StatusPill
              label={
                record.identityMethod === 'manual'
                  ? 'Fixed'
                  : record.checkOutAt
                    ? 'Done'
                    : 'In'
              }
              tone={
                record.identityMethod === 'manual'
                  ? 'warning'
                  : record.checkOutAt
                    ? 'success'
                    : 'info'
              }
            />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.7 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  emptyBox: {
    marginTop: 8,
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  empty: { textAlign: 'center', lineHeight: 22, fontSize: 14 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '600' },
});

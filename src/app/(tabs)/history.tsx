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
    queryFn: async () => {
      if (!company) return [];
      return services.attendance.listTodayForCompany(company.id, startUtc, endUtc);
    },
  });

  useFocusEffect(
    useCallback(() => {
      void query.refetch();
    }, [query])
  );

  const records = query.data ?? [];
  const completed = records.filter((r) => r.checkInAt && r.checkOutAt).length;
  const open = records.filter((r) => r.checkInAt && !r.checkOutAt).length;
  const showSkeleton = query.isLoading || (query.isFetching && records.length === 0);

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Today</Text>
      <Text style={{ color: theme.textSecondary }}>{todayLabel()}</Text>

      <View style={styles.stats}>
        <Stat label="Punches" value={showSkeleton ? '…' : String(records.length)} theme={theme} />
        <Stat label="Complete" value={showSkeleton ? '…' : String(completed)} theme={theme} />
        <Stat label="Still in" value={showSkeleton ? '…' : String(open)} theme={theme} />
      </View>

      {settings?.adminModeEnabled ? (
        <Button
          title="Open reports"
          variant="secondary"
          onPress={() => router.push(href('/admin/reports'))}
        />
      ) : null}

      {showSkeleton ? (
        <SkeletonList count={5} lines={3} />
      ) : records.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>
          No punches yet today. People punch from the Punch tab.
        </Text>
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
  container: { padding: 16, gap: 10, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  empty: { marginTop: 28, textAlign: 'center', lineHeight: 22 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
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

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import type { AttendanceWithOffice } from '@/features/attendance/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatLocalDate, formatLocalTime } from '@/utils/datetime';

interface Props {
  record: AttendanceWithOffice;
  onPress?: () => void;
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'rejected') return 'danger';
  if (status === 'locally_accepted') return 'success';
  if (status === 'pending_verification' || status === 'pending_sync') return 'warning';
  if (status === 'synced') return 'info';
  return 'neutral';
}

export function AttendanceCard({ record, onPress }: Props) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={[styles.date, { color: theme.text }]}>
            {formatLocalDate(record.checkInAt ?? record.createdAt)}
          </Text>
          <StatusPill label={record.attendanceStatus} tone={statusTone(record.attendanceStatus)} />
        </View>
        <Text style={{ color: theme.textSecondary }}>{record.officeName}</Text>
        <Text style={{ color: theme.text }}>
          In {formatLocalTime(record.checkInAt)} · Out {formatLocalTime(record.checkOutAt)}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          Geofence: {record.geofenceStatus} · Face verify: {record.faceVerificationStatus}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  date: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12 },
});

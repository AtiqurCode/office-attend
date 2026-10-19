import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ScreenLoading } from '@/components/ui/ScreenLoading';
import { StatusPill } from '@/components/ui/StatusPill';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { formatLocalDateTime } from '@/utils/datetime';
import { formatDistance } from '@/utils/geo';

export default function AttendanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const services = useServices();

  const query = useQuery({
    queryKey: ['attendance', id],
    enabled: !!id,
    queryFn: async () => {
      const record = await services.attendance.getById(id);
      if (!record) return null;
      const office = await services.offices.getById(record.officeId);
      const employee = await services.employees.getById(record.employeeId);
      const evidence = await services.attendance.listEvidence(record.id);
      return { record, office, employee, evidence };
    },
  });

  if (query.isLoading) {
    return <ScreenLoading message="Loading punch…" />;
  }

  if (!query.data?.record) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Record not found</Text>
      </View>
    );
  }

  const { record, office, employee, evidence } = query.data;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <Card style={{ gap: 8 }}>
        <Text style={[styles.title, { color: theme.text }]}>
          {employee?.fullName ?? 'Employee'}
        </Text>
        <Text style={{ color: theme.textSecondary }}>{employee?.employeeCode}</Text>
        <StatusPill label={record.attendanceStatus} tone="warning" />
        <Text style={{ color: theme.textSecondary }}>
          Check-in: {formatLocalDateTime(record.checkInAt)}
        </Text>
        <Text style={{ color: theme.textSecondary }}>
          Check-out: {formatLocalDateTime(record.checkOutAt)}
        </Text>
        <Text style={{ color: theme.textSecondary }}>Office: {office?.name ?? '—'}</Text>
        <Text style={{ color: theme.textSecondary }}>
          Identity method: {record.identityMethod ?? '—'}
        </Text>
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={[styles.section, { color: theme.text }]}>GPS</Text>
        <Text style={{ color: theme.text }}>In: {record.checkInLocationLabel ?? '—'}</Text>
        <Text style={{ color: theme.text }}>Out: {record.checkOutLocationLabel ?? '—'}</Text>
        <Text style={{ color: theme.textSecondary }}>
          Distances: {formatDistance(record.checkInDistanceMeters)} /{' '}
          {formatDistance(record.checkOutDistanceMeters)}
        </Text>
        <Text style={{ color: theme.warning }}>
          {record.locationValidationMessage ?? 'Best-effort local GPS validation only.'}
        </Text>
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={[styles.section, { color: theme.text }]}>Photos</Text>
        {evidence.length === 0 ? (
          <Text style={{ color: theme.textSecondary }}>No photos attached.</Text>
        ) : (
          evidence.map((item) => (
            <View key={item.id} style={{ gap: 6 }}>
              <Text style={{ color: theme.textSecondary }}>
                {item.evidenceType} · {formatLocalDateTime(item.capturedAt)}
              </Text>
              <Image source={{ uri: item.localFilePath }} style={styles.photo} />
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  section: { fontSize: 16, fontWeight: '700' },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: '#00000022',
  },
});

import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatDistance } from '@/utils/geo';

interface Props {
  officeName?: string | null;
  distanceMeters?: number | null;
  accuracyMeters?: number | null;
  message?: string | null;
  inside?: boolean | null;
}

export function LocationStatus({
  officeName,
  distanceMeters,
  accuracyMeters,
  message,
  inside,
}: Props) {
  const theme = useAppTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: theme.text }]}>Location</Text>
        <StatusPill
          label={
            inside == null ? 'Unknown' : inside ? 'Inside geofence' : 'Outside geofence'
          }
          tone={inside == null ? 'neutral' : inside ? 'info' : 'warning'}
        />
      </View>
      <Text style={{ color: theme.textSecondary }}>
        Office: {officeName ?? 'Not selected'}
      </Text>
      <Text style={{ color: theme.textSecondary }}>
        Distance: {formatDistance(distanceMeters ?? null)}
        {accuracyMeters != null ? ` · Accuracy ±${Math.round(accuracyMeters)} m` : ''}
      </Text>
      {message ? (
        <Text style={[styles.msg, { color: theme.textSecondary }]}>{message}</Text>
      ) : null}
      <Text style={[styles.disclaimer, { color: theme.warning }]}>
        Best-effort local GPS validation — not tamper-proof.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: '700' },
  msg: { fontSize: 13, lineHeight: 18 },
  disclaimer: { fontSize: 11, fontWeight: '600' },
});

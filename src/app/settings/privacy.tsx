import { ScrollView, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function PrivacyScreen() {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <Card style={{ gap: 10 }}>
        <Text style={[styles.title, { color: theme.text }]}>Privacy & security (V1)</Text>
        <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>
          Office Attend stores employee profile data, optional reference/attendance selfies, GPS
          coordinates for attendance attempts, and office configuration in Firestore (when configured)
          and/or on-device storage.
        </Text>
        <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>
          Foreground location is requested only during attendance or when refreshing distance.
          Background tracking is not used.
        </Text>
        <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>
          Punch identity is PIN or photo evidence. Optional face templates are on-device helpers only —
          not certified biometrics or identity proof.
        </Text>
        <Text style={{ color: theme.warning, lineHeight: 20 }}>
          Anyone who controls this device can alter local records, GPS, or admin settings. Server
          validation, integrity checks, and authoritative face matching belong in a future backend.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
});

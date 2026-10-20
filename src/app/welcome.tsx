import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { APP_NAME } from '@/constants/config';
import { WELCOME_SEEN_KEY } from '@/constants/welcome';
import { useAppTheme } from '@/hooks/useAppTheme';
import { href } from '@/utils/navigation';

export default function WelcomeScreen() {
  const theme = useAppTheme();

  const go = async (mode: 'login' | 'register') => {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, '1');
    router.replace(href(`/auth?mode=${mode}`));
  };

  return (
    <Screen brandBand contentStyle={styles.root}>
      <View style={styles.hero}>
        <BrandMark size={104} />
        <Text style={[styles.brand, { color: theme.brand }]}>{APP_NAME}</Text>
        <Text style={[styles.headline, { color: theme.text }]}>
          Shared punch for the whole office.
        </Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          One floor device. People check in with PIN or photo. You run sites, people, and reports
          from Manage.
        </Text>

        <View style={styles.pills}>
          {['PIN punch', 'Photo evidence', 'GPS sites'].map((label) => (
            <View
              key={label}
              style={[styles.pill, { backgroundColor: theme.brandSoft, borderColor: theme.border }]}
            >
              <Text style={{ color: theme.brand, fontWeight: '700', fontSize: 13 }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Get started" onPress={() => void go('login')} />
        <Pressable onPress={() => void go('register')} style={styles.secondaryLink}>
          <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 15 }}>
            New company?{' '}
            <Text style={{ color: theme.brand, fontWeight: '800' }}>Create an account</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', gap: 12, paddingBottom: 20 },
  brand: { fontSize: 15, fontWeight: '800', letterSpacing: 0.8, marginTop: 8 },
  headline: { fontSize: 30, fontWeight: '800', lineHeight: 36, letterSpacing: -0.3 },
  sub: { fontSize: 16, lineHeight: 24, maxWidth: 360 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  actions: { gap: 12, paddingBottom: 8 },
  secondaryLink: { paddingVertical: 10 },
});

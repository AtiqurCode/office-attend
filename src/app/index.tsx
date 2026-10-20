import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { WELCOME_SEEN_KEY } from '@/constants/welcome';
import { isFirebaseConfigured } from '@/firebase/config';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAppStore } from '@/store/appStore';
import { href } from '@/utils/navigation';

export default function Index() {
  const theme = useAppTheme();
  const hydrated = useAppStore((s) => s.hydrated);
  const authUser = useAppStore((s) => s.authUser);
  const company = useAppStore((s) => s.company);
  const settings = useAppStore((s) => s.settings);
  const firebase = isFirebaseConfigured();
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
        if (!cancelled) setWelcomeSeen(v === '1');
      } catch {
        if (!cancelled) setWelcomeSeen(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated || !settings || (firebase && !authUser && welcomeSeen === null)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator color={theme.brand} />
      </View>
    );
  }

  if (firebase && !authUser) {
    if (!welcomeSeen) {
      return <Redirect href={href('/welcome')} />;
    }
    return <Redirect href={href('/auth?mode=login')} />;
  }

  if (!company || !settings.onboardingCompleted) {
    return <Redirect href={href('/onboarding')} />;
  }

  return <Redirect href={href('/(tabs)/home')} />;
}

import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

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

  if (!hydrated || !settings) {
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
    return <Redirect href={href('/auth')} />;
  }

  if (!company || !settings.onboardingCompleted) {
    return <Redirect href={href('/onboarding')} />;
  }

  return <Redirect href={href('/(tabs)/home')} />;
}

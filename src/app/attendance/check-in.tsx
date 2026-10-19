import { Redirect } from 'expo-router';

import { href } from '@/utils/navigation';

export default function CheckInRedirect() {
  return <Redirect href={href('/(tabs)/home')} />;
}

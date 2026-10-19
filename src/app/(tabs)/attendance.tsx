import { Redirect } from 'expo-router';

import { href } from '@/utils/navigation';

/** Attend tab removed from kiosk UX — redirect to home. */
export default function AttendanceTabRedirect() {
  return <Redirect href={href('/(tabs)/home')} />;
}

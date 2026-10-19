import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { getFirebaseStorage } from '@/firebase/config';
import { createId } from '@/utils/uuid';

/** Upload a local image URI to Firebase Storage; returns public download URL. */
export async function uploadAttendancePhoto(opts: {
  companyId: string;
  attendanceId: string;
  localUri: string;
  kind: string;
}): Promise<string> {
  const response = await fetch(opts.localUri);
  const blob = await response.blob();
  const path = `companies/${opts.companyId}/attendance/${opts.attendanceId}/${opts.kind}-${createId()}.jpg`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

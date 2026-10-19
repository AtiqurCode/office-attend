import * as FileSystem from 'expo-file-system/legacy';

import { createId } from '@/utils/uuid';

const ROOT = `${FileSystem.documentDirectory ?? ''}attendance-media/`;

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export class ImageStorageService {
  async savePrivateImage(
    sourceUri: string,
    category: 'profile' | 'reference' | 'attendance'
  ): Promise<string> {
    await ensureDir(ROOT);
    const folder = `${ROOT}${category}/`;
    await ensureDir(folder);
    const dest = `${folder}${createId()}.jpg`;
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  }

  async deleteIfExists(path: string | null | undefined): Promise<void> {
    if (!path) return;
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  }

  async clearAllMedia(): Promise<void> {
    const info = await FileSystem.getInfoAsync(ROOT);
    if (info.exists) {
      await FileSystem.deleteAsync(ROOT, { idempotent: true });
    }
  }

  async exportDatabaseCopy(dbPath: string, destName: string): Promise<string> {
    const dest = `${FileSystem.cacheDirectory ?? ''}${destName}`;
    await FileSystem.copyAsync({ from: dbPath, to: dest });
    return dest;
  }
}

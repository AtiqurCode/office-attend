import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';

import { createId } from '@/utils/uuid';

const ROOT = `${FileSystem.documentDirectory ?? ''}attendance-media/`;
/** Long edge cap. Old handsets fill up fast on full-resolution camera JPEGs. */
const MAX_EDGE = 960;

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

function readSize(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve(width > 0 && height > 0 ? { width, height } : null),
      () => resolve(null)
    );
  });
}

/** Downscale and recompress. Falls back to the original uri if the phone can't decode it. */
async function compactJpeg(sourceUri: string): Promise<string> {
  const size = await readSize(sourceUri);
  const longEdge = size ? Math.max(size.width, size.height) : 0;
  const actions =
    size && longEdge > MAX_EDGE
      ? [
          size.width >= size.height
            ? { resize: { width: MAX_EDGE } }
            : { resize: { height: MAX_EDGE } },
        ]
      : [];
  const out = await ImageManipulator.manipulateAsync(sourceUri, actions, {
    compress: 0.65,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return out.uri || sourceUri;
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
    let from = sourceUri;
    try {
      from = await compactJpeg(sourceUri);
    } catch {
      from = sourceUri;
    }
    await FileSystem.copyAsync({ from, to: dest });
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

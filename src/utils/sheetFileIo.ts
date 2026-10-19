import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type SaveSheetResult =
  | { ok: true; method: 'folder' | 'share'; pathHint: string }
  | { ok: false; canceled: true }
  | { ok: false; canceled: false; message: string };

function basenameNoExt(filename: string): string {
  return filename.replace(/\.xlsx$/i, '').replace(/[^\w.-]+/g, '_');
}

/** Write workbook into a user-chosen directory (Android Downloads / SD / etc.). */
export async function saveXlsxToPhoneFolder(
  base64: string,
  filename: string
): Promise<SaveSheetResult> {
  if (Platform.OS !== 'android') {
    return {
      ok: false,
      canceled: false,
      message: 'Folder picker is Android-only. Use Share → Save to Files on iOS.',
    };
  }

  const { StorageAccessFramework } = FileSystem;
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    return { ok: false, canceled: true };
  }

  try {
    const fileUri = await StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      basenameNoExt(filename),
      XLSX_MIME
    );
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return {
      ok: true,
      method: 'folder',
      pathHint: `Saved in the folder you picked (${filename}).`,
    };
  } catch (e) {
    return {
      ok: false,
      canceled: false,
      message: e instanceof Error ? e.message : 'Could not write into that folder.',
    };
  }
}

/** Share sheet — user can pick Drive, Bluetooth, Files, etc. */
export async function shareXlsx(base64: string, filename: string): Promise<SaveSheetResult> {
  try {
    const path = `${FileSystem.cacheDirectory ?? ''}${filename}`;
    await FileSystem.writeAsStringAsync(path, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return {
        ok: true,
        method: 'share',
        pathHint: `File ready at app cache:\n${path}`,
      };
    }
    await Sharing.shareAsync(path, {
      mimeType: XLSX_MIME,
      dialogTitle: `Save or send ${filename}`,
      UTI: 'com.microsoft.excel.xlsx',
    });
    return {
      ok: true,
      method: 'share',
      pathHint: 'Use the share sheet → Files / Downloads / Drive to keep a copy.',
    };
  } catch (e) {
    return {
      ok: false,
      canceled: false,
      message: e instanceof Error ? e.message : 'Share failed.',
    };
  }
}

/**
 * Ask where to put the file. Android: folder picker (storage locations) or share.
 * iOS: share (Save to Files).
 */
export function promptSaveXlsx(base64: string, filename: string): Promise<SaveSheetResult> {
  return new Promise((resolve) => {
    const buttons: {
      text: string;
      style?: 'cancel' | 'destructive' | 'default';
      onPress?: () => void;
    }[] = [];

    if (Platform.OS === 'android') {
      buttons.push({
        text: 'Save to phone folder…',
        onPress: () => {
          void saveXlsxToPhoneFolder(base64, filename).then(resolve);
        },
      });
    }

    buttons.push({
      text: Platform.OS === 'ios' ? 'Share / Save to Files…' : 'Share…',
      onPress: () => {
        void shareXlsx(base64, filename).then(resolve);
      },
    });

    buttons.push({
      text: 'Cancel',
      style: 'cancel',
      onPress: () => resolve({ ok: false, canceled: true }),
    });

    Alert.alert(
      'Where to save?',
      Platform.OS === 'android'
        ? 'Pick a folder (Downloads, Documents, SD card, USB) or open the share sheet.'
        : 'Share the file, then choose Save to Files / Downloads.',
      buttons
    );
  });
}

const SPREADSHEET_EXT = /\.(xlsx|xls|csv)$/i;

/** System file picker — browse Downloads, Drive, USB, etc. */
export async function pickSpreadsheetFile(): Promise<
  | { ok: true; uri: string; name: string }
  | { ok: false; canceled: true }
  | { ok: false; canceled: false; message: string }
> {
  try {
    // `*/*` so Android shows all storage providers (Downloads, Files, Drive…),
    // not only apps that register Excel MIME types.
    const pick = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (pick.canceled || !pick.assets?.[0]?.uri) {
      return { ok: false, canceled: true };
    }
    const asset = pick.assets[0];
    const name = asset.name || asset.uri;
    if (!SPREADSHEET_EXT.test(name) && asset.mimeType && !/sheet|excel|csv/i.test(asset.mimeType)) {
      return {
        ok: false,
        canceled: false,
        message: 'Pick an .xlsx, .xls, or .csv file.',
      };
    }
    return { ok: true, uri: asset.uri, name };
  } catch (e) {
    return {
      ok: false,
      canceled: false,
      message: e instanceof Error ? e.message : 'Could not open file picker.',
    };
  }
}

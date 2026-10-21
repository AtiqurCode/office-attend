import type { ExpoConfig } from 'expo/config';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';

/** `xxx.apps.googleusercontent.com` → `com.googleusercontent.apps.xxx` */
function reversedGoogleClientId(clientId: string): string | null {
  const suffix = '.apps.googleusercontent.com';
  if (!clientId.endsWith(suffix)) return null;
  const prefix = clientId.slice(0, -suffix.length);
  return prefix ? `com.googleusercontent.apps.${prefix}` : null;
}

const iosUrlScheme =
  reversedGoogleClientId(webClientId) ??
  // Fallback matches current Firebase Web client (override via EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).
  'com.googleusercontent.apps.200870263438-5t6q960vvq3mbg2elcor8tsmen58pjih';

// Optional local file (gitignored). Evaluated at config time via Node require.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hasGoogleServices = Boolean(require('fs').existsSync('google-services.json'));

const config: ExpoConfig = {
  name: 'Office Attend',
  slug: 'biometAttendence',
  version: '1.0.6',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'biometattendence',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.attendface.app',
    infoPlist: {
      NSCameraUsageDescription:
        'Office Attend uses the camera to capture enrollment and attendance selfies.',
      NSLocationWhenInUseUsageDescription:
        'Office Attend uses your location during attendance to validate the office geofence.',
    },
  },
  android: {
    package: 'com.attendface.app',
    // Keep focused inputs visible when the soft keyboard opens (no pan/sticky clash).
    softwareKeyboardLayoutMode: 'resize',
    adaptiveIcon: {
      backgroundColor: '#1F5C45',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    predictiveBackGestureEnabled: false,
    // Optional: download from Firebase after adding EAS SHA-1 (see FIREBASE.md).
    ...(hasGoogleServices ? { googleServicesFile: './google-services.json' } : {}),
  },
  web: {
    // `static` SSR cannot serialize expo-sqlite's web worker chunk.
    // Android is the V1 target — use single-page web if you open the browser.
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'expo-router',
      {
        // SharedArrayBuffer headers for expo-sqlite on web (dev/EAS Hosting).
        headers: {
          'Cross-Origin-Embedder-Policy': 'credentialless',
          'Cross-Origin-Opener-Policy': 'same-origin',
        },
      },
    ],
    'expo-sqlite',
    'expo-secure-store',
    [
      'react-native-nitro-google-signin',
      {
        iosUrlScheme,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Allow Office Attend to use the camera for enrollment and attendance selfies.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: false,
        isAndroidBackgroundLocationEnabled: false,
        isIosBackgroundLocationEnabled: false,
        locationWhenInUsePermission:
          'Allow Office Attend to use your location during attendance for geofence validation.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Office Attend to select a profile photo.',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#1F5C45',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          // Universal APKs default to 4 ABIs (incl. x86 emulators). Phones only need ARM.
          buildArchs: ['armeabi-v7a', 'arm64-v8a'],
          // Compress native libs in the APK (smaller download; slight install I/O tradeoff).
          useLegacyPackaging: true,
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          enableBundleCompression: true,
          // RN Image GIF/WebP decoders — unused (camera JPEGs only).
          gifEnabled: false,
          webpEnabled: false,
          networkInspector: false,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID ||
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
        '5a1350ed-5943-441a-ab7e-9874d981a232',
    },
  },
};

export default config;

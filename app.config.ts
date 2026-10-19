import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Office Attend',
  slug: 'biometAttendence',
  version: '1.0.0',
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
      NSFaceIDUsageDescription:
        'Office Attend can optionally require device biometrics before recording attendance.',
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
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
    ],
    predictiveBackGestureEnabled: false,
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
      'expo-local-authentication',
      {
        faceIDPermission:
          'Allow Office Attend to use Face ID as an optional device gate before attendance.',
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

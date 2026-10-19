const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Required by expo-sqlite web (wa-sqlite.wasm + worker chunk).
config.resolver.assetExts.push('wasm');

// Firebase Auth: `firebase/auth` re-exports `@firebase/auth` via the browser
// entry. Force the React Native build so getReactNativePersistence exists.
const firebaseAuthRn = path.resolve(
  __dirname,
  'node_modules/@firebase/auth/dist/rn/index.js'
);
const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform !== 'web' &&
    (moduleName === '@firebase/auth' || moduleName === 'firebase/auth')
  ) {
    return { type: 'sourceFile', filePath: firebaseAuthRn };
  }
  if (upstreamResolve) {
    return upstreamResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

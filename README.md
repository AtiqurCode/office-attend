# Office Attend

Shared-device **office punch kiosk** for Android (Expo SDK 57).

One tablet/phone on the floor: employees check **in/out** with **PIN** or **photo**, tagged with **GPS** at your sites. Admins manage people, locations, and CSV reports from the same app.

| | |
|---|---|
| **Display name** | Office Attend |
| **Android package** | `com.attendface.app` |
| **Repo** | [AtiqurCode/office-attend](https://github.com/AtiqurCode/office-attend) |
| **Backend** | Firebase Auth + Firestore (online), or local SQLite if Firebase env is empty |

---

## Features

- **Welcome → Sign in** (register available; Get started opens login first)
- **Punch** — pick person, PIN / photo, geofenced site
- **Board** — today’s punches (in / complete / still in)
- **Manage** — people, Excel bulk import/export, sites, company, missed punch fix, CSV reports
- **Cloud mode** — Firestore when `EXPO_PUBLIC_FIREBASE_*` is set (required for multi-device / public use)
- **Local mode** — SQLite when Firebase env is empty (dev / offline prototype)

---

## Requirements

- Node.js 20+ and npm
- Expo Go **or** an EAS / local Android build (camera, location, and production APK need a real build)
- Firebase project (for cloud mode) — see [FIREBASE.md](FIREBASE.md)
- Phone must have **real internet** for Firebase (LAN to your PC for Metro is not enough)

---

## Configure

### 1. Install

```bash
git clone https://github.com/AtiqurCode/office-attend.git
cd office-attend
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

Fill `.env` (never commit secrets — `.env` is gitignored):

| Variable | Required for cloud | Notes |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | yes | Web app config |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | optional | Defaults to `{projectId}.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | yes | |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | yes | |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | yes | |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | yes | |
| `EXPO_PUBLIC_FIREBASE_USE_STORAGE` | no | `false` = photos stay on device (default) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | for Google sign-in | Firebase → Auth → Google → Web client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | recommended for APK Google sign-in | |
| `EAS_PROJECT_ID` | for EAS builds | Expo project id |

Full Firebase Console steps: **[FIREBASE.md](FIREBASE.md)** (Auth, Firestore rules, Storage).

Restart Metro after any `.env` change:

```bash
npx expo start -c
```

### 3. EAS preview env (required for APKs)

Local `.env` is **not** uploaded to EAS. Push non-empty vars to the **preview** environment:

```bash
# Create a temp file with only non-empty lines from .env, then:
npx eas-cli@latest env:push --path .env.eas-preview --environment preview --force
```

Or set variables in [expo.dev](https://expo.dev) → Project → Environment variables → **preview**.

Without this, the APK skips login and opens **Company setup** (SQLite path).

---

## Run (development)

```bash
npm start
# or
npx expo start -c
```

- Press `a` for Android (device/emulator preferred)
- Expo Go is fine for UI/auth flows; native camera/location need a **dev build** or preview APK for full kiosk use

```bash
npm run typecheck
npm run lint
npm test
npm run doctor
```

---

## Build Android APK (internal / public testing)

Uses EAS cloud build (no local Android Studio required).

```bash
# once per machine
npm install -g eas-cli
# or: npx eas-cli@latest …

eas login
eas build:configure   # if needed

# Preview APK (internal distribution)
eas build -p android --profile preview
```

- Profile `preview` → **APK** (`eas.json`)
- Profile `production` → **AAB** for Play Store
- When asked to install on emulator after build → **No** if you don’t have `adb` / Android SDK

Install: open the Expo build page URL on the phone → download APK → allow unknown sources if prompted.

**Version:** set `version` in `app.config.ts` / `package.json`. Preview builds auto-increment Android `versionCode` (`eas.json` → `autoIncrement`).

**Smaller APKs:** release builds use R8, resource shrink, ARM-only ABIs, and compressed native libs (`expo-build-properties` in `app.config.ts`).

---

## App icons

```bash
npm run icons
```

Regenerates launcher/splash assets from the brand eye mark into `assets/images/`.

---

## Typical setup flow (cloud)

1. Deploy Firestore rules from `firestore.rules` (see FIREBASE.md)
2. Configure `.env` + EAS preview env
3. Build preview APK and install on the floor device
4. Open app → **Get started** → **Sign in** / register
5. Complete **Company setup** (first site + punch methods)
6. Manage → unlock → add people / bulk Excel → assign sites
7. Punch tab → employees check in/out

---

## Project structure (short)

```
src/app/           Expo Router screens (welcome, auth, tabs, admin)
src/components/    UI (forms, brand, loading)
src/firebase/      Auth + Firestore repositories
src/features/      Domain types & SQLite repos (local mode)
src/services/      Punch / face / location wiring
app.config.ts      Expo + Android plugins
eas.json           EAS build profiles
FIREBASE.md        Firebase Console checklist
```

---

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Metro bundler |
| `npm run android` | Open Android |
| `npm test` | Jest |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run doctor` | `expo-doctor` |
| `npm run icons` | Regenerate icons |
| `eas build -p android --profile preview` | Cloud APK |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| APK opens Company setup, Expo Go shows login | Push `EXPO_PUBLIC_*` to EAS **preview**, rebuild |
| “Online required” / `auth/network-request-failed` | Phone needs internet to Google/Firebase; test in mobile browser |
| Keyboard covers inputs | Forms use scroll-to-focus; tab bar hides on keyboard — reload app after update |
| Google sign-in fails on APK | Set Web + Android client IDs; add SHA-1 in Firebase for the EAS keystore |
| `expo-doctor` complains about `eas-cli` | Don’t install `eas-cli` as a project dependency — use `npx eas-cli@latest` |

---

## License / use

Private product repo by default. Configure Firebase under your own project before any public distribution. Do not commit `.env`, keystores, or service account JSON.

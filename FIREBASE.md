# Firebase setup (online-only Office Attend)

When `EXPO_PUBLIC_FIREBASE_*` is set, the app uses **Firestore** for companies, people, sites, attendance, and settings — and **blocks punches offline**. SQLite is unused in that mode.

`EXPO_PUBLIC_FIREBASE_USE_STORAGE` only toggles **photo uploads** to Firebase Storage. It does **not** move employees to SQLite. With `USE_STORAGE=false` (default), punch/profile images stay on-device; employee records still live in Firestore under `companies/{companyId}/employees`.

## 1. Create project

1. Open [Firebase Console](https://console.firebase.google.com/) → **Add project**
2. Suggested project name: `OfficeAttend` (or your company name)
3. Disable Google Analytics if you don’t need it (optional)

## 2. Register apps (use these values)

| Platform | Field | Value |
|----------|--------|--------|
| **Android** | Package name | `com.attendface.app` |
| **iOS** | Bundle ID | `com.attendface.app` |
| **Web** | App nickname | `Office Attend Web` (required for JS SDK config) |

Nickname tip: register a **Web** app even for Expo Go — the JS SDK uses the web `firebaseConfig`.

App display name: `Office Attend`  
Deep link / scheme (already in app): `biometattendence`  
Android/iOS package (unchanged for Firebase): `com.attendface.app`

You do **not** need `google-services.json` / `GoogleService-Info.plist` for the JS SDK + Expo Go path.

## 3. Enable products

1. **Authentication** → Sign-in method → enable:
   - **Email/Password**
   - **Google** (see [Google Sign-In](#google-sign-in) below)
2. **Firestore Database** → Create database → paste `firestore.rules` → Publish
3. **Storage** — optional. Default keeps photos **local** (`EXPO_PUBLIC_FIREBASE_USE_STORAGE=false`).

Region: pick closest (e.g. `asia-south1` for BD/IN).

## Google Sign-In

Google uses **native** Credential Manager (`react-native-nitro-google-signin`). It does **not** work in Expo Go — you need an **EAS preview APK** or `npx expo run:android`.

### Checklist (most failures are here)

1. **Firebase → Authentication → Google → Enable**
2. Copy the **Web client ID** (ends with `.apps.googleusercontent.com`) into:
   - `.env` → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - EAS **preview** env (same name) — APKs do not read local `.env`
3. **Do not** put an **Android** OAuth client ID into `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.  
   That causes Android `DEVELOPER_ERROR`.  
   The Web client and Firebase project number must match (e.g. both start with `200870263438-…` for this project).
4. **Android app** in Firebase must use package `com.attendface.app`.
5. Add **EAS keystore SHA-1 and SHA-256** to that Android app:
   ```bash
   npx eas-cli@latest credentials -p android
   # Keystore → copy SHA-1 / SHA-256 fingerprints
   ```
   Firebase Console → Project settings → Your apps → Android (`com.attendface.app`) → Add fingerprint.

   **Current preview keystore** (local `credentials.json` — Oct 2026 rotation; old EAS default SHA was already claimed elsewhere):
   ```
   SHA-1:   F5:21:DA:40:01:3F:41:92:13:12:83:02:BF:2E:11:DD:14:A3:A4:74
   SHA-256: 5C:33:2E:B6:C5:EB:6F:AD:09:C9:AF:D6:A7:7E:9A:09:6E:48:88:8C:F3:96:96:13:CA:AE:57:41:1A:4C:84:E0
   ```

   If Firebase says the fingerprint is “already in use”, that combo is owned by another Google/Firebase project — do **not** reuse the old SHA; add the **new** one above instead.

   Also delete any **Android OAuth client** whose project number is **not** `200870263438` (e.g. leftover `974382478795-…` / `103588257427-…` clients). Those cause `DEVELOPER_ERROR`.
6. (Recommended) Download **`google-services.json`** after adding fingerprints, place it at the project root (gitignored). Rebuild the APK so the plugin can pick it up.
7. Rebuild preview APK and install a **fresh** build (uninstall old APK first).

### Test matrix

| Build | Google button |
|-------|----------------|
| Expo Go | Expected fail — native module missing |
| EAS preview APK, SHA missing / wrong Web client | `DEVELOPER_ERROR` |
| EAS preview APK, SHA + Web client OK | Account picker → Firebase session → company bootstrap |

### Optional env

| Variable | Role |
|----------|------|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | **Required** — Web OAuth client from **this** Firebase project |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Optional notes only; native One Tap uses the **Web** client ID |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | iOS builds only |

## 4. Copy config into `.env`

From Project settings → Your apps → Web app → **SDK setup and configuration**:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Restart Expo after editing `.env` (`npx expo start --clear`).

## 5. Deploy rules

Repo files:

- `firestore.rules`
- `storage.rules`

Console → Firestore / Storage → Rules → paste → Publish.

Or with Firebase CLI:

```bash
firebase deploy --only firestore:rules,storage
```

## 6. Composite index (first open punch may prompt)

Firestore may ask you to create an index for:

- Collection: `companies/{id}/attendance`
- Fields: `employeeId` Asc, `isOpen` Asc, `checkInAt` Desc

Click the link in the error, or create it in Firebase Console → Firestore → Indexes.

## Data shape

```
companies/{companyId}
  name, enabledAuthMethods, ...
  employees/{employeeId}     // pinHash, officeIds[]
  offices/{officeId}
  attendance/{recordId}      // isOpen, GPS, syncStatus=synced
    evidence/{evidenceId}    // fileUrl (Storage)
```

Storage: `companies/{companyId}/attendance/{recordId}/*.jpg`

## Mode switch

| Condition | Backend |
|-----------|---------|
| All `EXPO_PUBLIC_FIREBASE_*` set | Firestore (online required) |
| Missing / incomplete | Local SQLite (previous behaviour) |

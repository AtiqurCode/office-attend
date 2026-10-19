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
   - **Google** (copy the **Web client ID** into `.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)
2. **Firestore Database** → Create database → paste `firestore.rules` → Publish
3. **Storage** — optional. Default keeps photos **local** (`EXPO_PUBLIC_FIREBASE_USE_STORAGE=false`).

Region: pick closest (e.g. `asia-south1` for BD/IN).

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

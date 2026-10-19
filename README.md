# Office Attend — Shared Kiosk Attendance

Expo SDK 57 Android kiosk app (**Office Attend** / OfficeAttend): one company per install, many employees, PIN / photo identity, GPS-tagged check-in/out.

**Backend:** fill `EXPO_PUBLIC_FIREBASE_*` in `.env` → online-only Firestore (see [FIREBASE.md](FIREBASE.md)). Leave them empty → local SQLite.

## Quick start

```bash
npm install
npx expo start -c
# press `a` for Android (prefer device / emulator — not web)
```

Face recognition needs a development build:

```bash
npx expo run:android
# optional native module:
# npm install expo-face-detection
```

Regenerate app icons from the eye mark SVG:

```bash
node scripts/generate-app-icons.mjs
```

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Metro |
| `npm run android` | Open Android |
| `npm test` | Jest |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Kiosk flow

1. Company setup (name, first location, enabled auth methods)
2. Admin unlock → add employees (PIN required; optional face enroll)
3. Kiosk home → tap employee → verify (PIN / Face) → GPS → result with lat/lng
4. Today board shows all pairs (multiple per employee allowed after checkout)

## Identity methods

| Method | Notes |
|---|---|
| PIN | 4-digit, hashed per employee |
| Photo | Evidence capture (optional face template) |

## Brand

- Display name: **Office Attend**
- Compact: **OfficeAttend**
- Icon: eye mark (`assets/expo.icon/Assets/eye_tracking.svg`) on brand green `#1F5C45`

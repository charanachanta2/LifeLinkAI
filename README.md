# LifeLink (Expo app)

## Run
```bash
npm install
npx expo start        # scan the QR with Expo Go
```
No dev build needed. If you change `.env`, restart with `npx expo start --clear`.

## Setup once
1. Firebase Console -> Authentication -> Sign-in method -> enable **Email/Password**.
2. Project Settings -> Your apps -> add a **Web app**, copy its config into `.env`
   (see `.env.example`; `EXPO_PUBLIC_FIREBASE_APP_ID` should be the web app id).
3. Backend needs `FIREBASE_SERVICE_ACCOUNT_BASE64` (see backend `.env.example`),
   and `config/api.ts` must point at it (`USE_LOCAL_BACKEND` / `LOCAL_IP`).

## Auth flow
Firebase (email/password) signs in on the device -> the Firebase ID token is sent as
`Authorization: Bearer` on every API call -> `POST /api/auth/sync` creates/loads the
LifeLink profile (role, phone, donor info). Police/hospital/fire/pharmacy accounts need a
Firebase user with the same email as their existing LifeLink account.

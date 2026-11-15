// Firebase client (Auth only). Identity lives in Firebase; the LifeLink
// backend verifies the Firebase ID token on every request.
//
// NOTE: EXPO_PUBLIC_* variables must be referenced literally (not through a
// dynamic key) so Expo can inline them into the bundle.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

export const app: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

function createAuth(): Auth {
  if (Platform.OS === "web") return getAuth(app);

  // On React Native the session must be persisted in AsyncStorage or the
  // user is signed out every time the app restarts. The helper is exported
  // by the react-native build of firebase/auth but missing from its public
  // TypeScript types, hence the cast.
  const getReactNativePersistence = (FirebaseAuth as any)
    .getReactNativePersistence as
    | ((storage: typeof AsyncStorage) => any)
    | undefined;

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence
        ? getReactNativePersistence(AsyncStorage)
        : undefined,
    });
  } catch {
    // Fast Refresh re-runs this module; auth is already initialised.
    return getAuth(app);
  }
}

export const auth: Auth = createAuth();

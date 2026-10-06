import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import type { Auth } from "firebase/auth";

// ============================================================
// FIREBASE CONFIG
// ============================================================
// Values come from .env (EXPO_PUBLIC_FIREBASE_*). Firebase Console ->
// Project Settings -> General -> Your apps -> Web app -> SDK config.
// (Create a "Web app" there if you haven't; it is what the JS SDK uses,
// and it is what makes this run in Expo Go with plain `npx expo start`.)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createAuth(): Auth {
  if (Platform.OS === "web") return FirebaseAuth.getAuth(app);

  // Keeps the user signed in across app restarts on iOS/Android.
  // (cast: the RN-only export isn't in the default TS typings)
  const getReactNativePersistence = (FirebaseAuth as any)
    .getReactNativePersistence;

  try {
    return FirebaseAuth.initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Already initialised (fast refresh) -> reuse it.
    return FirebaseAuth.getAuth(app);
  }
}

export const auth = createAuth();

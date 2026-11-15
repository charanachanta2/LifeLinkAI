import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { Platform } from "react-native";

// Same Firebase project the backend verifies tokens against
// (FIREBASE_SERVICE_ACCOUNT_BASE64 on Vercel must be a service account
// from THIS project: lifelinkkai).
const firebaseConfig = {
  apiKey: "AIzaSyAtGsZMulayEySOHD4-SBWMcKKTIKCq5EA",
  authDomain: "lifelinkkai.firebaseapp.com",
  projectId: "lifelinkkai",
  storageBucket: "lifelinkkai.firebasestorage.app",
  messagingSenderId: "139723049809",
  appId: "1:139723049809:android:f958ba0c45b1e73e7be170",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createAuth() {
  if (Platform.OS === "web") return FirebaseAuth.getAuth(app);

  // Keeps the Firebase session across app restarts on native.
  const getReactNativePersistence = (FirebaseAuth as any)
    .getReactNativePersistence;

  try {
    return FirebaseAuth.initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Fast Refresh re-runs this module; auth is already initialised.
    return FirebaseAuth.getAuth(app);
  }
}

export const firebaseAuth = createAuth();

// Google sign-in, isolated so the rest of the app never crashes if the
// native module is missing (e.g. a dev build made before the package was
// added). Email/password login keeps working either way.

import { Platform } from "react-native";

export class GoogleSignInCancelled extends Error {
  constructor() {
    super("Google sign-in was cancelled");
    this.name = "GoogleSignInCancelled";
  }
}

export class GoogleSignInUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleSignInUnavailable";
  }
}

let configured = false;
let cachedModule: any | null | undefined;

function loadNativeModule(): any | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
    // Required lazily on purpose: importing it at the top level throws
    // when the native side isn't compiled into the installed app.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require("@react-native-google-signin/google-signin");
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

/** Returns a Google ID token (native only). */
export async function getGoogleIdToken(): Promise<string> {
  if (Platform.OS === "web") {
    throw new GoogleSignInUnavailable("Use the web popup flow on web.");
  }

  const mod = loadNativeModule();
  if (!mod?.GoogleSignin) {
    throw new GoogleSignInUnavailable(
      "Google sign-in needs a fresh app build. Rebuild the dev client with `npx expo run:android` (or an EAS development build), then try again."
    );
  }

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new GoogleSignInUnavailable(
      "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing from .env."
    );
  }

  const { GoogleSignin, statusCodes } = mod;

  if (!configured) {
    GoogleSignin.configure({ webClientId, offlineAccess: false });
    configured = true;
  }

  try {
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    }

    const res = await GoogleSignin.signIn();

    // v13+ returns { type: "success" | "cancelled", data }
    if (res?.type === "cancelled") throw new GoogleSignInCancelled();

    const idToken: string | undefined = res?.data?.idToken ?? res?.idToken;
    if (!idToken) {
      throw new GoogleSignInUnavailable(
        "Google did not return an ID token. Check the Web client ID in .env."
      );
    }
    return idToken;
  } catch (err: any) {
    if (
      err instanceof GoogleSignInCancelled ||
      err instanceof GoogleSignInUnavailable
    ) {
      throw err;
    }
    if (
      err?.code === statusCodes?.SIGN_IN_CANCELLED ||
      err?.code === statusCodes?.IN_PROGRESS
    ) {
      throw new GoogleSignInCancelled();
    }
    if (err?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new GoogleSignInUnavailable(
        "Google Play Services is not available on this device."
      );
    }
    // DEVELOPER_ERROR (code 10) = SHA-1 / client-id mismatch in Firebase.
    if (String(err?.code) === "10" || /DEVELOPER_ERROR/i.test(err?.message)) {
      throw new GoogleSignInUnavailable(
        "Google sign-in is not configured for this build yet (add this build's SHA-1 in Firebase, re-download google-services.json, and rebuild)."
      );
    }
    throw new GoogleSignInUnavailable(
      err?.message || "Google sign-in failed. Please try again."
    );
  }
}

export async function googleSignOut(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const mod = loadNativeModule();
    if (mod?.GoogleSignin && configured) await mod.GoogleSignin.signOut();
  } catch {
    // ignore: signing out of Firebase is what matters
  }
}

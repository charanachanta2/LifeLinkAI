import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import * as SecureStore from "expo-secure-store";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { registerForPushNotificationsAsync } from "@/utils/pushNotifications";
import { API_BASE_URL } from "@/config/api";
import { firebaseAuth } from "@/config/firebase";

// ---- Config ----
const BASE_URL = API_BASE_URL;
const TOKEN_KEY = "lifelink_auth_token";
const USER_KEY = "lifelink_auth_user";

// Firebase error codes -> the messages the UI already shows.
function friendlyAuthError(err: any, fallback: string): Error {
  switch (err?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return new Error("Invalid email or password");
    case "auth/email-already-in-use":
      return new Error("An account with this email already exists");
    case "auth/weak-password":
      return new Error("Password must be at least 8 characters");
    case "auth/too-many-requests":
      return new Error("Too many attempts. Please try again later.");
    case "auth/account-exists-with-different-credential":
      return new Error("An account with this email already exists. Log in with your password.");
    case "auth/network-request-failed":
      return new Error("Could not reach the server. Check your connection.");
    default:
      return new Error(err?.message || fallback);
  }
}

export type AuthUser = {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  isPhoneVerified?: boolean;
  role?: "civilian" | "police" | "hospital" | "firestation" | "pharmacy" | "admin";
  roleStatus?: "approved" | "pending" | "rejected";
  orgName?: string;
  location?: { lat: number; lng: number } | null;
  hasPushToken?: boolean;
  bloodGroup?: string | null;
  isDonor?: boolean;
  donorAvailable?: boolean;
  lastDonatedAt?: string | null;
};

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean; // true while checking SecureStore on app boot
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (
    name: string,
    email: string,
    password: string,
    username?: string
  ) => Promise<void>;
  /** Pass the Google ID token; it is exchanged for a Firebase session. */
  googleLogin: (googleIdToken: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  authHeaders: () => Record<string, string>;
  refreshUser: () => Promise<void>;
  updateAgencyLocation: (lat: number, lng: number) => Promise<void>;
  /** Route for the (tabs)-style group this user's role belongs in. */
  homeRoute: () => string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Maps a user's role to the tab group they should land on after login.
function roleHomeRoute(role?: AuthUser["role"]): string {
  switch (role) {
    case "police":
      return "/(police)";
    case "hospital":
      return "/(hospital)";
    case "firestation":
      return "/(firestation)";
    case "pharmacy":
      return "/(pharmacy)";
    case "civilian":
    case "admin":
    default:
      return "/(tabs)";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Firebase owns the session. onIdTokenChanged fires on boot (restored
  // session), on sign-in/out, and whenever Firebase silently renews the
  // ~1h ID token, so `token` always holds a currently valid Bearer token.
  useEffect(() => {
    let cancelled = false;

    // Show the last known profile instantly while Firebase restores.
    SecureStore.getItemAsync(USER_KEY)
      .then((stored) => {
        if (!cancelled && stored) setUser(JSON.parse(stored));
      })
      .catch(() => {});

    // Drop any pre-Firebase JWT left over from older builds.
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});

    const unsubscribe = onIdTokenChanged(
      firebaseAuth,
      async (fbUser: FirebaseUser | null) => {
        if (cancelled) return;
        if (!fbUser) {
          setToken(null);
          setUser(null);
          SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
          setIsLoading(false);
          return;
        }
        try {
          const idToken = await fbUser.getIdToken();
          setToken(idToken);

          // Best-effort: refresh profile (role approval, phone, donor
          // fields may have changed server-side since last launch).
          fetch(`${BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${idToken}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((body) => {
              if (cancelled || !body?.user) return;
              setUser(body.user);
              SecureStore.setItemAsync(USER_KEY, JSON.stringify(body.user)).catch(
                () => {}
              );
            })
            .catch(() => {});
        } catch (err) {
          console.warn("Failed to read Firebase ID token", err);
        } finally {
          setIsLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Turns a freshly signed-in Firebase user into a LifeLink profile
  // (POST /api/auth/sync) and stores it.
  const syncWithBackend = useCallback(
    async (
      fbUser: FirebaseUser,
      extra?: { name?: string; username?: string }
    ): Promise<{ idToken: string; user: AuthUser }> => {
      const idToken = await fbUser.getIdToken();
      const res = await fetch(`${BASE_URL}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(extra || {}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to sync account");

      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(body.user));
      setToken(idToken);
      setUser(body.user);
      return { idToken, user: body.user as AuthUser };
    },
    []
  );

  // Registers this device for push notifications and sends the
  // Expo push token to the backend. Fire-and-forget: never blocks
  // login, and failures (e.g. simulator, permission denied) are
  // silently ignored since push is a "nice to have", not required
  // to use the app.
  const syncPushToken = useCallback(async (authToken: string) => {
    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (!pushToken) return;

      await fetch(`${BASE_URL}/api/auth/push-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pushToken }),
      });
    } catch (err) {
      console.warn("Push token sync failed (non-fatal):", err);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const cred = await signInWithEmailAndPassword(
          firebaseAuth,
          email.trim().toLowerCase(),
          password
        );
        const { idToken, user: synced } = await syncWithBackend(cred.user);
        syncPushToken(idToken);
        return synced;
      } catch (err: any) {
        await signOut(firebaseAuth).catch(() => {});
        throw friendlyAuthError(err, "Login failed");
      }
    },
    [syncWithBackend, syncPushToken]
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      username?: string
    ) => {
      try {
        const cred = await createUserWithEmailAndPassword(
          firebaseAuth,
          email.trim().toLowerCase(),
          password
        );
        try {
          const { idToken } = await syncWithBackend(cred.user, {
            name,
            username: username || undefined,
          });
          syncPushToken(idToken);
        } catch (err) {
          // e.g. "Username is already taken": undo the Firebase account so
          // the person can retry with the same email.
          await cred.user.delete().catch(() => {});
          throw err;
        }
      } catch (err: any) {
        await signOut(firebaseAuth).catch(() => {});
        throw friendlyAuthError(err, "Registration failed");
      }
    },
    [syncWithBackend, syncPushToken]
  );

  const googleLogin = useCallback(
    async (googleIdToken: string) => {
      try {
        const cred = await signInWithCredential(
          firebaseAuth,
          GoogleAuthProvider.credential(googleIdToken)
        );
        const { idToken, user: synced } = await syncWithBackend(cred.user);
        syncPushToken(idToken);
        return synced;
      } catch (err: any) {
        await signOut(firebaseAuth).catch(() => {});
        throw friendlyAuthError(err, "Google login failed");
      }
    },
    [syncWithBackend, syncPushToken]
  );

  const logout = useCallback(async () => {
    await signOut(firebaseAuth).catch(() => {});
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    setToken(null);
    setUser(null);
  }, []);

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  // Re-fetches the user from /api/auth/me and updates both state + SecureStore.
  // Call this after anything that changes user fields server-side
  // (e.g. phone verification) so the rest of the app sees the new data.
  const refreshUser = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || "Failed to refresh user");

    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(body.user));
    setUser(body.user);
  }, [token]);

  // Saves this agency account's station GPS coordinates on the
  // backend, so "nearby police" (and future nearby-hospital/fire)
  // matching can find it when a civilian sends an SOS.
  const updateAgencyLocation = useCallback(
    async (lat: number, lng: number) => {
      if (!token) return;
      const res = await fetch(`${BASE_URL}/api/auth/location`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lat, lng }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to update location");

      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(body.user));
      setUser(body.user);
    },
    [token]
  );

  const homeRoute = useCallback(() => roleHomeRoute(user?.role), [user]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoggedIn: !!token,
        isLoading,
        login,
        register,
        googleLogin,
        logout,
        authHeaders,
        refreshUser,
        updateAgencyLocation,
        homeRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an <AuthProvider>");
  return ctx;
}

export { BASE_URL };
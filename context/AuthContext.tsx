import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import * as SecureStore from "expo-secure-store";
import { registerForPushNotificationsAsync } from "@/utils/pushNotifications";

// ---- Config ----
const BASE_URL = "https://lifelink-backend-neon.vercel.app";
const TOKEN_KEY = "lifelink_auth_token";
const USER_KEY = "lifelink_auth_user";

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
    otp: string,
    username?: string
  ) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
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

  // On app boot: check SecureStore for an existing session.
  // This is what makes the user stay logged in across app restarts.
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
      } catch (err) {
        console.warn("Failed to load stored session", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistSession = useCallback(
    async (newToken: string, newUser: AuthUser) => {
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
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
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Login failed");
      await persistSession(body.token, body.user);
      syncPushToken(body.token);
      return body.user as AuthUser;
    },
    [persistSession, syncPushToken]
  );

  const sendOtp = useCallback(async (email: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || "Failed to send OTP");
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      otp: string,
      username?: string
    ) => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, otp, username }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Registration failed");
      await persistSession(body.token, body.user);
      syncPushToken(body.token);
    },
    [persistSession, syncPushToken]
  );

  const googleLogin = useCallback(
    async (idToken: string) => {
      const res = await fetch(`${BASE_URL}/api/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Google login failed");
      await persistSession(body.token, body.user);
      syncPushToken(body.token);
    },
    [persistSession, syncPushToken]
  );

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
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
        sendOtp,
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
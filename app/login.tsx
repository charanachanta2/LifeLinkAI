import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "@/components/ll-text";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { LL } from "@/constants/lifelink-theme";
import { GOOGLE_WEB_CLIENT_ID } from "@/config/google";

// Google sign-in uses a native module that exists only in a development /
// production build — NOT in Expo Go. Load it defensively so the login screen
// still renders (button shown; tapping it explains) when it isn't available.
let GoogleLib: typeof import("@react-native-google-signin/google-signin") | null =
  null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  GoogleLib = require("@react-native-google-signin/google-signin");
  GoogleLib!.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
} catch {
  GoogleLib = null;
}

export default function Login() {
  const router = useRouter();
  const { login, googleLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const goToHome = (role?: string) => {
    switch (role) {
      case "police":
        router.replace("/(police)");
        break;
      case "hospital":
        router.replace("/(hospital)");
        break;
      case "firestation":
        router.replace("/(firestation)");
        break;
      case "pharmacy":
        router.replace("/(pharmacy)");
        break;
      default:
        router.replace("/(tabs)");
    }
  };

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      // login() lives in AuthContext — it handles the request, saves the
      // session (SecureStore), and flips isLoggedIn to true. It also
      // returns the logged-in user object so we can route by role below.
      const loggedInUser = await login(email.trim(), password);
      goToHome(loggedInUser?.role);
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // Native Google sign-in returns an ID token; AuthContext exchanges it for
  // a Firebase session and syncs the LifeLink profile (POST /api/auth/sync).
  const handleGoogle = async () => {
    if (!GoogleLib) {
      setError(
        "Google sign-in isn't available in Expo Go. Use a development build."
      );
      return;
    }
    const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } =
      GoogleLib;

    setError("");
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Clear any cached Google account so the account picker always shows.
      await GoogleSignin.signOut().catch(() => {});
      const result = await GoogleSignin.signIn();

      if (!isSuccessResponse(result)) return; // user cancelled

      const idToken = result.data.idToken;
      if (!idToken) {
        setError("Google sign-in failed (no token). Please try again.");
        return;
      }
      const u = await googleLogin(idToken);
      goToHome(u?.role);
    } catch (err: any) {
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
          case statusCodes.IN_PROGRESS:
            return;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError("Google Play Services is not available on this device.");
            return;
        }
      }
      // DEVELOPER_ERROR here almost always means a wrong web client ID or
      // a missing SHA-1 in Firebase.
      setError(err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🩺</Text>
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Log in to continue to LifeLink</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor={LL.textDim}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor={LL.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>
                {loading ? "Logging in..." : "Log In"}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, loading && styles.googleButtonDisabled]}
              onPress={handleGoogle}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>

            <Text style={styles.legalNote}>
              By logging in you agree to our{" "}
              <Link href="/terms" style={styles.legalLink}>
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" style={styles.legalLink}>
                Privacy Policy
              </Link>
              .
            </Text>

            <Link href="/register" asChild>
              <TouchableOpacity style={styles.linkWrap}>
                <Text style={styles.linkText}>
                  Don&apos;t have an account?{" "}
                  <Text style={styles.linkBold}>Sign up</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  container: { flex: 1, backgroundColor: "transparent" },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: { marginBottom: 32, alignItems: "center" },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: LL.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  logoEmoji: { fontSize: 32 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: LL.text,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: { fontSize: 15, color: LL.textMuted, textAlign: "center" },
  form: { width: "100%" },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: "600", color: LL.textSoft, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: LL.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: LL.text,
    backgroundColor: LL.elevated,
  },
  errorText: {
    color: LL.dangerText,
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  button: {
    backgroundColor: LL.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
    shadowColor: LL.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 3,
  },
  buttonDisabled: { backgroundColor: LL.accentDisabled, shadowOpacity: 0 },
  buttonText: { color: LL.onAccent, fontSize: 16, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginTop: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: LL.border },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: LL.textMuted },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: LL.border,
    backgroundColor: LL.elevated,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  googleButtonDisabled: { opacity: 0.5 },
  googleG: { fontSize: 18, fontWeight: "800", color: LL.accent, marginRight: 10 },
  googleText: { fontSize: 15.5, fontWeight: "600", color: LL.text },
  linkWrap: { marginTop: 22, alignItems: "center" },
  linkText: { color: LL.textMuted, fontSize: 14 },
  linkBold: { color: LL.accent, fontWeight: "700" },
  legalNote: {
    fontSize: 12.5,
    lineHeight: 18,
    color: LL.textMuted,
    textAlign: "center",
    marginTop: 16,
  },
  legalLink: { color: LL.accent, fontWeight: "700" },
});
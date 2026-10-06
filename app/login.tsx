import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isFirebaseConfigured } from "@/config/firebase";
import GoogleButton from "@/components/GoogleButton";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const router = useRouter();
  const { login, googleLogin, resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleForgot = async () => {
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Enter your email above, then tap Forgot password");
      return;
    }
    try {
      await resetPassword(email.trim());
      setMessage("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      setError(err.message || "Could not send reset email");
    }
  };

  const handleGoogle = async () => {
    setError("");
    setMessage("");
    try {
      const profile = await googleLogin();
      if (!profile) return; // closed the Google popup
      routeByRole(profile.role);
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    }
  };

  const routeByRole = (role?: string) => {
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
    setMessage("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      // login() signs in with Firebase, loads the LifeLink profile from the
      // backend and returns it so we can route by role below.
      const loggedInUser = await login(email.trim(), password);

      routeByRole(loggedInUser?.role);
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
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
                placeholderTextColor="#9CA3AF"
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
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />
            </View>

            <TouchableOpacity onPress={handleForgot} style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {!isFirebaseConfigured ? (
              <Text style={styles.errorText}>
                Firebase isn&apos;t configured. Fill in the EXPO_PUBLIC_FIREBASE_* values in .env and restart with npx expo start --clear.
              </Text>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {message ? <Text style={styles.successText}>{message}</Text> : null}

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

            <GoogleButton onPress={handleGoogle} disabled={loading} />

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
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
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
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  logoEmoji: { fontSize: 32 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center" },
  form: { width: "100%" },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  forgotWrap: { alignSelf: "flex-end", marginBottom: 12 },
  forgotText: { color: "#2563EB", fontSize: 13.5, fontWeight: "600" },
  successText: {
    color: "#16A34A",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  buttonDisabled: { backgroundColor: "#93C5FD", shadowOpacity: 0 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  linkWrap: { marginTop: 22, alignItems: "center" },
  linkText: { color: "#6B7280", fontSize: 14 },
  linkBold: { color: "#2563EB", fontWeight: "700" },
  legalNote: {
    fontSize: 12.5,
    lineHeight: 18,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 16,
  },
  legalLink: { color: "#DC2626", fontWeight: "700" },
});
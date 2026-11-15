import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
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

export default function Register() {
  const router = useRouter();
  const { register, homeRoute } = useAuth();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    setError("");
    setMessage("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields");
      return;
    }
    if (!agreed) {
      setError("Please accept the Terms & Conditions and Privacy Policy to continue");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      // register() creates the Firebase account, syncs it with the
      // backend (POST /api/auth/sync) and signs the user in.
      await register(name.trim(), email, password, username.trim() || undefined);
      router.replace(homeRoute() as any);
    } catch (err: any) {
      setError(err?.message || "Registration failed");
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Sign up to get started with LifeLink
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                placeholder="Enter your name"
                placeholderTextColor={LL.textDim}
                value={name}
                onChangeText={setName}
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username (optional)</Text>
              <TextInput
                placeholder="Choose a username"
                placeholderTextColor={LL.textDim}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                placeholder="Re-enter your password"
                placeholderTextColor={LL.textDim}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={styles.input}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {message ? <Text style={styles.successText}>{message}</Text> : null}

            <View style={styles.consentRow}>
              <TouchableOpacity
                onPress={() => setAgreed((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
              >
                <Ionicons
                  name={agreed ? "checkbox" : "square-outline"}
                  size={26}
                  color={agreed ? LL.accent : LL.textDim}
                />
              </TouchableOpacity>

              <Text style={styles.consentText}>
                I agree to the{" "}
                <Text
                  style={styles.consentLink}
                  onPress={() => router.push("/terms" as any)}
                >
                  Terms & Conditions
                </Text>{" "}
                and{" "}
                <Text
                  style={styles.consentLink}
                  onPress={() => router.push("/privacy-policy" as any)}
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>
                {loading ? "Registering..." : "Register"}
              </Text>
            </TouchableOpacity>

            <Link href="/login" asChild>
              <TouchableOpacity style={styles.linkWrap}>
                <Text style={styles.linkText}>
                  Already have an account?{" "}
                  <Text style={styles.linkBold}>Log in</Text>
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
    paddingVertical: 28,
  },
  header: { marginBottom: 28 },
  title: { fontSize: 28, fontWeight: "700", color: LL.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: LL.textMuted },
  form: { width: "100%" },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: LL.textSoft, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: LL.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: LL.text,
    backgroundColor: LL.elevated,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowInput: { flex: 1 },
  otpButton: {
    backgroundColor: LL.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  otpButtonText: { color: LL.onAccent, fontSize: 13, fontWeight: "700" },
  errorText: {
    color: LL.dangerText,
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  successText: {
    color: LL.accent,
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
  linkWrap: { marginTop: 22, alignItems: "center" },
  linkText: { color: LL.textMuted, fontSize: 14 },
  linkBold: { color: LL.accent, fontWeight: "700" },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  consentText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: LL.textSoft },
  consentLink: { color: LL.accent, fontWeight: "700" },
});
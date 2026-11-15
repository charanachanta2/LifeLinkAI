import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "@/components/ll-text";
import { LL } from "@/constants/lifelink-theme";
import { useAuth } from "@/context/AuthContext";

// Web client ID from Firebase Console -> Authentication -> Sign-in method
// -> Google -> Web SDK configuration (set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

type Props = { onError: (message: string) => void };

export function GoogleSignInButton({ onError }: Props) {
  const router = useRouter();
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    onError("");

    if (!WEB_CLIENT_ID) {
      onError("Google sign-in isn't configured yet.");
      return;
    }

    setLoading(true);
    try {
      // Loaded lazily so the rest of the app still runs in a build that
      // doesn't include the native Google module yet.
      const { GoogleSignin, isSuccessResponse } = require("@react-native-google-signin/google-signin");

      GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // user cancelled

      const googleIdToken = response.data.idToken;
      if (!googleIdToken) throw new Error("Google did not return an ID token");

      const loggedInUser = await googleLogin(googleIdToken);

      switch (loggedInUser?.role) {
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
    } catch (err: any) {
      if (err?.code === "SIGN_IN_CANCELLED" || err?.code === "-5") return;
      onError(err?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={LL.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color={LL.text} />
            <Text style={styles.buttonText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: { flexDirection: "row", alignItems: "center", marginTop: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: LL.border },
  dividerText: { color: LL.textMuted, fontSize: 13 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: LL.border,
    backgroundColor: LL.elevated,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: LL.text, fontSize: 16, fontWeight: "600" },
});

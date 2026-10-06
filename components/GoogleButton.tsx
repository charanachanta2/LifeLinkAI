import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  /** Runs the Google flow; should resolve when done. Errors are reported via onError. */
  onPress: () => Promise<void>;
  disabled?: boolean;
  label?: string;
};

export default function GoogleButton({ onPress, disabled, label = "Continue with Google" }: Props) {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await onPress();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.or}>or</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity
        style={[styles.button, (busy || disabled) && styles.disabled]}
        onPress={handle}
        disabled={busy || disabled}
        activeOpacity={0.85}
      >
        {busy ? (
          <ActivityIndicator color="#374151" />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#DB4437" />
            <Text style={styles.text}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 16 },
  line: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  or: { marginHorizontal: 12, color: "#9CA3AF", fontSize: 13 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  disabled: { opacity: 0.6 },
  text: { color: "#374151", fontSize: 15.5, fontWeight: "600" },
});

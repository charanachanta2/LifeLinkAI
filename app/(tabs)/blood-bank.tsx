import { StyleSheet, Text, View } from "react-native";

export default function BloodBank() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🩸</Text>
      <Text style={styles.title}>Blood Bank</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280" },
});
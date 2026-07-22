import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <View />
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push("/profile")}
          accessibilityLabel="Open profile"
        >
          <Ionicons name="person-circle-outline" size={32} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>
          Welcome{user?.name ? `, ${user.name}` : ""}!
        </Text>
        <Text style={styles.subtitle}>Welcome to LifeLink AI App</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: { fontSize: 16, color: "#6B7280", textAlign: "center" },
});
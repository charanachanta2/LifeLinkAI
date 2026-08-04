import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const router = useRouter();
  const { token, user, authHeaders, logout } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!token) {
          router.replace("/login");
          return;
        }

        const response = await fetch(API.me, {
          headers: authHeaders(),
        });

        const data = await response.json();

        if (!response.ok) {
          router.replace("/login");
          return;
        }

        setName(data.user?.name || "");
      } catch (err) {
        // silently fall back to a generic welcome if this fails
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top", "bottom"]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.emojiCircle}>
            <Text style={styles.emoji}>👋</Text>
          </View>
          <Text style={styles.title}>Welcome{name ? `, ${name}` : ""}!</Text>
          <Text style={styles.subtitle}>Welcome to LifeLink AI App</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.75}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emoji: { fontSize: 40 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  subtitle: { fontSize: 16, color: "#6B7280", textAlign: "center" },
  logoutButton: {
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  logoutText: { color: "#DC2626", fontSize: 16, fontWeight: "700" },
});
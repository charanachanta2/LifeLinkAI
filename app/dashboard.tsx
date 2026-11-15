import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "@/components/ll-text";
import { SafeAreaView } from "react-native-safe-area-context";

import { API } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { LL } from "@/constants/lifelink-theme";

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
        <ActivityIndicator size="large" color={LL.accent} />
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
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: LL.surface,
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
    backgroundColor: LL.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emoji: { fontSize: 40 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: LL.text,
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  subtitle: { fontSize: 16, color: LL.textMuted, textAlign: "center" },
  logoutButton: {
    borderWidth: 1.5,
    borderColor: LL.dangerBorder,
    backgroundColor: LL.dangerSoft,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  logoutText: { color: LL.dangerText, fontSize: 16, fontWeight: "700" },
});
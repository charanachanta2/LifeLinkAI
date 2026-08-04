import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";

import { useAuth } from "@/context/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  police: "Police Station",
  hospital: "Hospital",
  firestation: "Fire Station",
  pharmacy: "Pharmacy",
};

const ROLE_COLORS: Record<string, string> = {
  police: "#1E3A8A",
  hospital: "#DC2626",
  firestation: "#C2410C",
  pharmacy: "#15803D",
};

export default function AgencyHomeScreen({ role }: { role: string }) {
  const { user, logout, updateAgencyLocation } = useAuth();
  const router = useRouter();
  const [savingLocation, setSavingLocation] = useState(false);

  const accentColor = ROLE_COLORS[role] || "#1E3A8A";
  const roleLabel = ROLE_LABELS[role] || "Agency";

  const shareLocation = async () => {
    try {
      setSavingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission needed",
          "LifeLink needs your location to route nearby SOS alerts to you."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      await updateAgencyLocation(
        position.coords.latitude,
        position.coords.longitude
      );

      Alert.alert(
        "Location saved",
        "Nearby SOS alerts will now be routed to this station."
      );
    } catch (err: any) {
      Alert.alert("Couldn't save location", err.message || "Try again.");
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.badge, { backgroundColor: accentColor }]}>
          <Text style={styles.badgeText}>{roleLabel}</Text>
        </View>

        <Text style={styles.orgName}>{user?.orgName || user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Station Location</Text>
          <Text style={styles.cardBody}>
            {user?.location
              ? `Saved: ${user.location.lat.toFixed(4)}, ${user.location.lng.toFixed(4)}`
              : "Not set yet — nearby SOS alerts can't reach you until you share your location."}
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: accentColor }]}
            onPress={shareLocation}
            disabled={savingLocation}
          >
            {savingLocation ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {user?.location ? "Update My Location" : "Share My Location"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/profile")}
        >
          <Text style={styles.secondaryButtonText}>View / Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  scroll: { padding: 20, paddingBottom: 40 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12, letterSpacing: 0.5 },
  orgName: { fontSize: 24, fontWeight: "900", color: "#111827" },
  email: { fontSize: 14, color: "#6B7280", marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#111827", marginBottom: 6 },
  cardBody: { fontSize: 13.5, color: "#4B5563", lineHeight: 19, marginBottom: 14 },
  primaryButton: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 14.5 },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: { color: "#111827", fontWeight: "700", fontSize: 14.5 },
  logoutButton: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#FEE2E2",
  },
  logoutText: { color: "#B91C1C", fontWeight: "800", fontSize: 14.5 },
});
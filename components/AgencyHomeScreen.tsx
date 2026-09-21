import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { themeFor } from "@/constants/agency";
import { API } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

// Profile tab for public-service accounts (police / hospital / fire
// station / pharmacy). This used to send people to the civilian
// /profile screen (emergency contacts, medical records...) which has
// nothing to do with a station account.
export default function AgencyHomeScreen({ role }: { role: string }) {
  const { user, logout, updateAgencyLocation, authHeaders, refreshUser } =
    useAuth();
  const router = useRouter();

  const theme = themeFor(role);

  const [savingLocation, setSavingLocation] = useState(false);

  const [phone, setPhone] = useState(user?.phone || "");
  const [editingPhone, setEditingPhone] = useState(!user?.phone);
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    setPhone(user?.phone || "");
    setEditingPhone(!user?.phone);
  }, [user?.phone]);

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
        "Nearby SOS alerts will now be routed to this station, and civilians can find you in Emergency Nearby."
      );
    } catch (err: any) {
      Alert.alert("Couldn't save location", err.message || "Try again.");
    } finally {
      setSavingLocation(false);
    }
  };

  const savePhone = async () => {
    const normalized = phone.replace(/\D/g, "").slice(-10);

    if (!/^[6-9]\d{9}$/.test(normalized)) {
      Alert.alert("Invalid phone number", "Enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setSavingPhone(true);

      const res = await fetch(API.phone, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ phone: normalized }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body?.message || "Failed to save phone number");
      }

      await refreshUser();
      setEditingPhone(false);
    } catch (err: any) {
      Alert.alert("Couldn't save number", err.message || "Try again.");
    } finally {
      setSavingPhone(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (err: any) {
      Alert.alert("Logout failed", err?.message || "Please try again.");
    }
  };

  const statusLabel =
    user?.roleStatus === "approved"
      ? "Approved"
      : user?.roleStatus === "rejected"
      ? "Rejected"
      : "Pending approval";

  const statusColor =
    user?.roleStatus === "approved"
      ? "#16A34A"
      : user?.roleStatus === "rejected"
      ? "#DC2626"
      : "#D97706";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Identity */}
          <View style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: theme.soft }]}>
              <Text style={styles.avatarEmoji}>{theme.emoji}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.orgName} numberOfLines={2}>
                {user?.orgName || user?.name}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: theme.color }]}>
              <Text style={styles.badgeText}>{theme.label}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor }]}>
              <Text style={styles.badgeText}>{statusLabel}</Text>
            </View>
          </View>

          {/* Contact number */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact Number</Text>
            <Text style={styles.cardBody}>
              Civilians can call this number from Emergency Nearby.
            </Text>

            {editingPhone ? (
              <>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={14}
                  style={styles.input}
                />
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.color }]}
                  onPress={savePhone}
                  disabled={savingPhone}
                >
                  {savingPhone ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save Number</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.phoneRow}>
                <Ionicons name="call" size={20} color={theme.color} />
                <Text style={styles.phoneText}>{user?.phone}</Text>
                <TouchableOpacity onPress={() => setEditingPhone(true)}>
                  <Text style={[styles.editLink, { color: theme.color }]}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Station location */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Station Location</Text>
            <Text style={styles.cardBody}>
              {user?.location
                ? `Saved: ${user.location.lat.toFixed(4)}, ${user.location.lng.toFixed(4)}. It also updates automatically whenever you open the Map tab.`
                : "Not set yet — nearby SOS alerts can't reach you until you share your location."}
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.color }]}
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

          {/* Legal */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Legal</Text>

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push("/privacy-policy" as any)}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color="#374151" />
              <Text style={styles.linkText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push("/terms" as any)}
            >
              <Ionicons name="document-text-outline" size={22} color="#374151" />
              <Text style={styles.linkText}>Terms & Conditions</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#B91C1C" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  scroll: { padding: 20, paddingBottom: 40 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  avatar: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 32 },
  orgName: { fontSize: 22, fontWeight: "900", color: "#111827" },
  email: { fontSize: 14, color: "#6B7280", marginTop: 3 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 18, flexWrap: "wrap" },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 12, letterSpacing: 0.4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 6 },
  cardBody: { fontSize: 13.5, color: "#4B5563", lineHeight: 19, marginBottom: 14 },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    marginBottom: 12,
  },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  phoneText: { flex: 1, fontSize: 17, fontWeight: "700", color: "#111827" },
  editLink: { fontSize: 14.5, fontWeight: "800" },
  primaryButton: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 14.5 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  linkText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
  divider: { height: 1, backgroundColor: "#F1F2F4" },
  logoutButton: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
  },
  logoutText: { color: "#B91C1C", fontWeight: "800", fontSize: 15 },
});

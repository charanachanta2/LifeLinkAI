import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

import { AGENCY_THEME } from "@/constants/agency";
import { useAuth, type AppMode } from "@/context/AuthContext";

// "Use LifeLink as…" - lets a police / hospital / fire / pharmacy account
// switch to the civilian side (SOS, find help, Blood Bank) and back, and
// lets demo accounts hop between every public service.
// Renders nothing for plain civilian accounts.

const LABEL: Record<AppMode, string> = {
  civilian: "Civilian",
  police: AGENCY_THEME.police.label,
  hospital: AGENCY_THEME.hospital.label,
  firestation: AGENCY_THEME.firestation.label,
  pharmacy: AGENCY_THEME.pharmacy.label,
};

const COLOR: Record<AppMode, string> = {
  civilian: "#DC2626",
  police: AGENCY_THEME.police.color,
  hospital: AGENCY_THEME.hospital.color,
  firestation: AGENCY_THEME.firestation.color,
  pharmacy: AGENCY_THEME.pharmacy.color,
};

const EMOJI: Record<AppMode, string> = {
  civilian: "🙂",
  police: AGENCY_THEME.police.emoji,
  hospital: AGENCY_THEME.hospital.emoji,
  firestation: AGENCY_THEME.firestation.emoji,
  pharmacy: AGENCY_THEME.pharmacy.emoji,
};

export default function ModeSwitcher() {
  const router = useRouter();
  const { mode, availableModes, switchMode } = useAuth();
  const [busy, setBusy] = useState<AppMode | null>(null);

  if (availableModes.length < 2) return null;

  const go = async (next: AppMode) => {
    if (next === mode || busy) return;
    try {
      setBusy(next);
      const route = await switchMode(next);
      router.replace(route as any);
    } catch (err: any) {
      Alert.alert("Couldn't switch", err?.message || "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="swap-horizontal" size={18} color="#111827" />
        <Text style={styles.title}>Use LifeLink as</Text>
      </View>
      <Text style={styles.body}>
        {mode === "civilian"
          ? "You're viewing LifeLink as a civilian. Switch back to your service account any time."
          : "Switch to Civilian to send an SOS, find nearby help or use the Blood Bank — then come back."}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {availableModes.map((m) => {
          const active = m === mode;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => go(m)}
              disabled={!!busy}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: COLOR[m], borderColor: COLOR[m] }
                  : { borderColor: "#D1D5DB" },
              ]}
            >
              {busy === m ? (
                <ActivityIndicator size="small" color={active ? "#fff" : COLOR[m]} />
              ) : (
                <Text style={styles.emoji}>{EMOJI[m]}</Text>
              )}
              <Text style={[styles.chipText, active && { color: "#fff" }]}>
                {LABEL[m]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "800", color: "#111827" },
  body: { fontSize: 13.5, color: "#4B5563", marginTop: 6, lineHeight: 19 },
  row: { gap: 8, paddingTop: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },
  emoji: { fontSize: 16 },
  chipText: { fontSize: 14, fontWeight: "700", color: "#111827" },
});

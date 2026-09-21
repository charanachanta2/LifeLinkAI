import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

// ============================================================
// TYPES
// ============================================================

type AgencyRole = "police" | "hospital" | "firestation" | "pharmacy";

type AgencyItem = {
  id: string;
  name: string;
  role: AgencyRole;
  phone?: string;
  email?: string;
  location: { lat: number; lng: number };
  distanceKm: number;
};

type SimpleRegion = { latitude: number; longitude: number };

// ------------------------------------------------------------
// DESIGN TOKENS
// ------------------------------------------------------------

const COLORS = {
  bg: "#FAFAFB",
  surface: "#FFFFFF",
  surfaceMuted: "#F5F6F8",
  border: "#ECEDF0",
  borderStrong: "#E2E4E9",

  text: "#15171E",
  textMuted: "#6E7280",
  textFaint: "#A1A4AE",

  ink: "#15171E",
  emergency: "#D7263D",
  emergencySoft: "#FDECEE",
};

const shadow = (opacity: number, radius: number, elevation: number) => ({
  shadowColor: "#0F1115",
  shadowOpacity: opacity,
  shadowOffset: { width: 0, height: Math.ceil(radius / 2.5) },
  shadowRadius: radius,
  elevation: Platform.OS === "android" ? elevation : 0,
});

const FILTERS: { type: AgencyRole; label: string; emoji: string; color: string; soft: string }[] = [
  { type: "police", label: "Police", emoji: "🚓", color: "#2563EB", soft: "#EAF0FE" },
  { type: "hospital", label: "Hospitals", emoji: "🏥", color: "#D7263D", soft: "#FDECEE" },
  { type: "firestation", label: "Fire Dept", emoji: "🚒", color: "#D9770B", soft: "#FDF1E2" },
  { type: "pharmacy", label: "Pharmacy", emoji: "💊", color: "#1A9D6D", soft: "#E5F7EF" },
];

// ------------------------------------------------------------
// Staggered fade + rise entrance for each responder card.
// ------------------------------------------------------------
function AnimatedCard({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index, 8) * 55,
      useNativeDriver: true,
    }).start();
  }, [progress, index]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export default function FindEmergency() {
  const { authHeaders } = useAuth();

  // Header entrance
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  const [region, setRegion] = useState<SimpleRegion | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  const [activeType, setActiveType] = useState<AgencyRole | null>(null);
  const [agencies, setAgencies] = useState<AgencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Get location once on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocError("Location permission is required to show public service people nearby.");
        setLoading(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    })();
  }, []);

  const fetchAgencies = useCallback(
    async (lat: number, lng: number) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(
          API.agenciesNearby(lat, lng, activeType ?? undefined),
          { headers: authHeaders() }
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || "Failed to load nearby responders");
        setAgencies(body.agencies ?? []);
      } catch (err: any) {
        setErrorMsg(err.message || "Something went wrong.");
        setAgencies([]);
      } finally {
        setLoading(false);
      }
    },
    [authHeaders, activeType]
  );

  useEffect(() => {
    if (region) fetchAgencies(region.latitude, region.longitude);
  }, [region?.latitude, region?.longitude, activeType, fetchAgencies]);

  const onRefresh = async () => {
    if (!region) return;
    setRefreshing(true);
    await fetchAgencies(region.latitude, region.longitude);
    setRefreshing(false);
  };

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const filterFor = (role: AgencyRole) => FILTERS.find((f) => f.type === role)!;

  // ---- Loading / permission states ----
  if (locError && !region) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <View style={styles.stateIconWrap}>
          <Ionicons name="location-outline" size={32} color={COLORS.emergency} />
        </View>
        <Text style={styles.title}>Location needed</Text>
        <Text style={styles.subtitle}>{locError}</Text>
      </SafeAreaView>
    );
  }

  if (!region) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color={COLORS.emergency} />
        <Text style={[styles.subtitle, { marginTop: 14 }]}>Getting your location…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.headerIconWrap}>
          <Text style={styles.emoji}>🚨</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Emergency Nearby</Text>
          <Text style={styles.headerSubtitle}>
            Registered police, hospital, fire and pharmacy responders near you
          </Text>
        </View>
      </Animated.View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        <TouchableOpacity
          style={[styles.chip, activeType === null && styles.chipActiveNeutral]}
          onPress={() => setActiveType(null)}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, activeType === null && styles.chipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {FILTERS.map((filter) => {
          const active = filter.type === activeType;
          return (
            <TouchableOpacity
              key={filter.type}
              onPress={() => setActiveType(filter.type)}
              activeOpacity={0.8}
              style={[
                styles.chip,
                active && { backgroundColor: filter.color, borderColor: filter.color },
              ]}
            >
              <Text style={styles.chipEmoji}>{filter.emoji}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.emergency} />
        </View>
      ) : (
        <FlatList
          data={agencies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyEmoji}>📍</Text>
              </View>
              <Text style={styles.emptyTitle}>Nothing found yet</Text>
              <Text style={styles.emptyText}>
                {errorMsg || "No registered responders found nearby yet."}
              </Text>
              {errorMsg ? (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={onRefresh}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Try again</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          renderItem={({ item, index }) => {
            const filter = filterFor(item.role);
            return (
              <AnimatedCard index={index}>
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.iconBadge, { backgroundColor: filter.soft }]}>
                    <Text style={styles.iconBadgeEmoji}>{filter.emoji}</Text>
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={[styles.rolePill, { backgroundColor: filter.soft }]}>
                      <Text style={[styles.rolePillText, { color: filter.color }]}>
                        {filter.label}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardBottomRow}>
                  <View style={styles.distanceRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.distanceText}>{item.distanceKm} km away</Text>
                  </View>
                  {!item.phone && !!item.email && (
                    <TouchableOpacity
                      style={[styles.callBtn, { backgroundColor: filter.color }]}
                      onPress={() => Linking.openURL(`mailto:${item.email}`)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="mail" size={16} color="#FFFFFF" />
                      <Text style={styles.callBtnText}>Email</Text>
                    </TouchableOpacity>
                  )}
                  {!!item.phone && (
                    <TouchableOpacity
                      style={[styles.callBtn, { backgroundColor: filter.color }]}
                      onPress={() => handleCall(item.phone)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="call" size={16} color="#FFFFFF" />
                      <Text style={styles.callBtnText}>Call</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              </AnimatedCard>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  stateIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.emergencySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 19, fontWeight: "700", color: COLORS.text, marginTop: 14, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 20 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 12,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.emergencySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 20 },
  headerTitle: { fontSize: 21, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  headerSubtitle: {
    fontSize: 12.5,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 17,
  },

  chipScroll: { flexGrow: 0, marginBottom: 12 },
  chipRow: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  chipActiveNeutral: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipEmoji: { fontSize: 19 },
  chipText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
  chipTextActive: { color: "#FFFFFF" },

  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },

  emptyState: { alignItems: "center", paddingTop: 64, paddingHorizontal: 20 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { fontSize: 15.5, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  emptyText: { fontSize: 13.5, color: COLORS.textMuted, textAlign: "center", lineHeight: 19 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow(0.04, 10, 2),
  },
  cardTopRow: { flexDirection: "row", alignItems: "center" },
  cardHeaderText: { flex: 1, marginLeft: 12 },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeEmoji: { fontSize: 30 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text },

  rolePill: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
    marginTop: 6,
  },
  rolePillText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },

  divider: { height: 1, backgroundColor: COLORS.border, marginTop: 14, marginBottom: 12 },

  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  distanceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  distanceText: { fontSize: 12.5, color: COLORS.textMuted, fontWeight: "500" },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    gap: 6,
  },
  callBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  retryBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.emergency,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  retryBtnText: { color: "#FFFFFF", fontSize: 14.5, fontWeight: "800" },
});
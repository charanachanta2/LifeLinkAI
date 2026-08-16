import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

// ============================================================
// TYPES
// ============================================================

type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

const BLOOD_GROUPS: BloodGroup[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

type BloodRequestItem = {
  id: string;
  patientName?: string;
  bloodGroup: BloodGroup;
  units: number;
  hospitalName?: string;
  contactPhone: string;
  notes?: string;
  urgency: "normal" | "urgent" | "critical";
  postedBy?: string;
  distanceKm: number;
  createdAt: string;
};

type DonorItem = {
  id: string;
  name: string;
  phone?: string;
  bloodGroup: BloodGroup;
  distanceKm: number;
  lastDonatedAt?: string;
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

  primary: "#D7263D",
  primaryDark: "#B31B2E",
  primarySoft: "#FDECEE",
  primaryBorder: "#F6C9CF",

  success: "#1A9D6D",
  successSoft: "#E5F7EF",

  normal: "#3B6FE0",
  normalSoft: "#EBF1FD",
  urgent: "#D97B12",
  urgentSoft: "#FDF1E2",
  critical: "#D7263D",
  criticalSoft: "#FDECEE",
};

const URGENCY_STYLES: Record<
  string,
  { color: string; soft: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  normal: { color: COLORS.normal, soft: COLORS.normalSoft, icon: "time-outline" },
  urgent: { color: COLORS.urgent, soft: COLORS.urgentSoft, icon: "alert-circle-outline" },
  critical: { color: COLORS.critical, soft: COLORS.criticalSoft, icon: "warning" },
};

const shadow = (opacity: number, radius: number, elevation: number) => ({
  shadowColor: "#0F1115",
  shadowOpacity: opacity,
  shadowOffset: { width: 0, height: Math.ceil(radius / 2.5) },
  shadowRadius: radius,
  elevation: Platform.OS === "android" ? elevation : 0,
});

// ============================================================
// COMPONENT
// ============================================================

export default function BloodBank() {
  const { authHeaders, user } = useAuth();

  const [tab, setTab] = useState<"requests" | "donors">("requests");
  const [region, setRegion] = useState<SimpleRegion | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  const [groupFilter, setGroupFilter] = useState<BloodGroup | null>(null);

  const [requests, setRequests] = useState<BloodRequestItem[]>([]);
  const [donors, setDonors] = useState<DonorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [donorModalVisible, setDonorModalVisible] = useState(false);

  // Get location once on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocError("Location permission is required to find nearby blood requests and donors.");
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

  const fetchRequests = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await fetch(
          API.bloodRequestsNearby(lat, lng, groupFilter ?? undefined),
          { headers: authHeaders() }
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || "Failed to load requests");
        setRequests(body.requests ?? []);
      } catch (err: any) {
        Alert.alert("Couldn't load requests", err.message || "Please try again.");
      }
    },
    [authHeaders, groupFilter]
  );

  const fetchDonors = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await fetch(
          API.bloodDonorsNearby(lat, lng, groupFilter ?? undefined),
          { headers: authHeaders() }
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || "Failed to load donors");
        setDonors(body.donors ?? []);
      } catch (err: any) {
        Alert.alert("Couldn't load donors", err.message || "Please try again.");
      }
    },
    [authHeaders, groupFilter]
  );

  const loadAll = useCallback(
    async (lat: number, lng: number) => {
      setLoading(true);
      await Promise.all([fetchRequests(lat, lng), fetchDonors(lat, lng)]);
      setLoading(false);
    },
    [fetchRequests, fetchDonors]
  );

  useEffect(() => {
    if (region) loadAll(region.latitude, region.longitude);
  }, [region?.latitude, region?.longitude, groupFilter, loadAll]);

  const onRefresh = async () => {
    if (!region) return;
    setRefreshing(true);
    await loadAll(region.latitude, region.longitude);
    setRefreshing(false);
  };

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  // ---- Loading / permission states ----
  if (locError && !region) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <View style={styles.stateIconWrap}>
          <Ionicons name="location-outline" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Location needed</Text>
        <Text style={styles.subtitle}>{locError}</Text>
      </SafeAreaView>
    );
  }

  if (!region) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.subtitle, { marginTop: 14 }]}>Getting your location…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Text style={styles.emoji}>🩸</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>Blood Bank</Text>
          <Text style={styles.headerSubtitle}>Find and offer help nearby</Text>
        </View>
      </View>

      {/* Tab switch */}
      <View style={styles.tabSwitch}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "requests" && styles.tabBtnActive]}
          onPress={() => setTab("requests")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="pulse-outline"
            size={15}
            color={tab === "requests" ? COLORS.primary : COLORS.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, tab === "requests" && styles.tabBtnTextActive]}>
            Requests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "donors" && styles.tabBtnActive]}
          onPress={() => setTab("donors")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people-outline"
            size={15}
            color={tab === "donors" ? COLORS.primary : COLORS.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, tab === "donors" && styles.tabBtnTextActive]}>
            Donors Nearby
          </Text>
        </TouchableOpacity>
      </View>

      {/* Blood group filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        <TouchableOpacity
          style={[styles.chip, groupFilter === null && styles.chipActive]}
          onPress={() => setGroupFilter(null)}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, groupFilter === null && styles.chipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {BLOOD_GROUPS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.chip, groupFilter === g && styles.chipActive]}
            onPress={() => setGroupFilter(g)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, groupFilter === g && styles.chipTextActive]}>
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : tab === "requests" ? (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyEmoji}>🩸</Text>
              </View>
              <Text style={styles.emptyTitle}>All quiet for now</Text>
              <Text style={styles.emptyText}>No active blood requests nearby right now.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const u = URGENCY_STYLES[item.urgency] ?? URGENCY_STYLES.normal;
            return (
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.groupBadge}>
                    <Text style={styles.groupBadgeText}>{item.bloodGroup}</Text>
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.patientName || "Patient"} · {item.units} unit
                      {item.units > 1 ? "s" : ""}
                    </Text>
                    {!!item.hospitalName && (
                      <Text style={styles.cardSubtitle} numberOfLines={1}>
                        {item.hospitalName}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.urgencyPill, { backgroundColor: u.soft }]}>
                    <Ionicons name={u.icon} size={11} color={u.color} />
                    <Text style={[styles.urgencyText, { color: u.color }]}>{item.urgency}</Text>
                  </View>
                </View>

                {!!item.notes && <Text style={styles.cardNotes}>{item.notes}</Text>}

                <View style={styles.divider} />

                <View style={styles.cardBottomRow}>
                  <View style={styles.distanceRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.distanceText}>{item.distanceKm} km away</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(item.contactPhone)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="call" size={14} color="#FFFFFF" />
                    <Text style={styles.callBtnText}>Call</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={donors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: COLORS.successSoft }]}>
                <Text style={styles.emptyEmoji}>🙌</Text>
              </View>
              <Text style={styles.emptyTitle}>No donors yet</Text>
              <Text style={styles.emptyText}>No available donors nearby right now.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={[styles.groupBadge, styles.groupBadgeDonor]}>
                  <Text style={[styles.groupBadgeText, styles.groupBadgeTextDonor]}>
                    {item.bloodGroup}
                  </Text>
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.distanceRow}>
                    <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.cardSubtitle}>{item.distanceKm} km away</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCall(item.phone)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="call" size={14} color="#FFFFFF" />
                  <Text style={styles.callBtnText}>Call</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Floating action buttons */}
      <View style={styles.fabRow}>
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => setDonorModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="heart" size={17} color={COLORS.primary} />
          <Text style={styles.fabSecondaryText}>Become a Donor</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, styles.fabPrimary]}
          onPress={() => setRequestModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={19} color="#FFFFFF" />
          <Text style={styles.fabPrimaryText}>Request Blood</Text>
        </TouchableOpacity>
      </View>

      <RequestBloodModal
        visible={requestModalVisible}
        onClose={() => setRequestModalVisible(false)}
        region={region}
        onCreated={() => {
          setRequestModalVisible(false);
          if (region) loadAll(region.latitude, region.longitude);
        }}
      />

      <DonorModal
        visible={donorModalVisible}
        onClose={() => setDonorModalVisible(false)}
        region={region}
        defaultBloodGroup={(user as any)?.bloodGroup}
        onSaved={() => {
          setDonorModalVisible(false);
          if (region) loadAll(region.latitude, region.longitude);
        }}
      />
    </SafeAreaView>
  );
}

// ============================================================
// REQUEST BLOOD MODAL
// ============================================================

function RequestBloodModal({
  visible,
  onClose,
  region,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  region: SimpleRegion | null;
  onCreated: () => void;
}) {
  const { authHeaders } = useAuth();
  const [patientName, setPatientName] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+");
  const [units, setUnits] = useState("1");
  const [hospitalName, setHospitalName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent" | "critical">("normal");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setPatientName("");
    setBloodGroup("O+");
    setUnits("1");
    setHospitalName("");
    setContactPhone("");
    setNotes("");
    setUrgency("normal");
  };

  const handleSubmit = async () => {
    if (!region) return;
    if (!contactPhone.trim()) {
      Alert.alert("Missing info", "Contact phone number is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(API.bloodRequests, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          patientName: patientName.trim() || undefined,
          bloodGroup,
          units: parseInt(units, 10) || 1,
          hospitalName: hospitalName.trim() || undefined,
          contactPhone: contactPhone.trim(),
          notes: notes.trim() || undefined,
          urgency,
          lat: region.latitude,
          lng: region.longitude,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to post request");

      reset();
      onCreated();
      Alert.alert("Request posted", "Nearby donors can now see your blood request.");
    } catch (err: any) {
      Alert.alert("Couldn't post request", err.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeaderRow}>
            <View>
              <Text style={styles.modalTitle}>Request Blood</Text>
              <Text style={styles.modalSubtitle}>Alert nearby donors instantly</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Patient name</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional"
              placeholderTextColor={COLORS.textFaint}
              value={patientName}
              onChangeText={setPatientName}
            />

            <Text style={styles.fieldLabel}>Blood group *</Text>
            <View style={styles.chipRowWrap}>
              {BLOOD_GROUPS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.pickChip, bloodGroup === g && styles.pickChipActive]}
                  onPress={() => setBloodGroup(g)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.pickChipText,
                      bloodGroup === g && styles.pickChipTextActive,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Units needed</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={units}
              onChangeText={setUnits}
            />

            <Text style={styles.fieldLabel}>Hospital / location name</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional"
              placeholderTextColor={COLORS.textFaint}
              value={hospitalName}
              onChangeText={setHospitalName}
            />

            <Text style={styles.fieldLabel}>Contact phone *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210"
              placeholderTextColor={COLORS.textFaint}
              keyboardType="phone-pad"
              value={contactPhone}
              onChangeText={setContactPhone}
            />

            <Text style={styles.fieldLabel}>Urgency</Text>
            <View style={styles.chipRowWrap}>
              {(["normal", "urgent", "critical"] as const).map((u) => {
                const active = urgency === u;
                const meta = URGENCY_STYLES[u];
                return (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.pickChip,
                      active && {
                        backgroundColor: meta.color,
                        borderColor: meta.color,
                      },
                    ]}
                    onPress={() => setUrgency(u)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.pickChipText, active && styles.pickChipTextActive]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Optional details"
              placeholderTextColor={COLORS.textFaint}
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.helperBox}>
              <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.helperText}>
                This request will use your current location so nearby donors can find it.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Post Request</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// DONOR MODAL (register / update as donor)
// ============================================================

function DonorModal({
  visible,
  onClose,
  region,
  defaultBloodGroup,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  region: SimpleRegion | null;
  defaultBloodGroup?: BloodGroup;
  onSaved: () => void;
}) {
  const { authHeaders } = useAuth();
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(defaultBloodGroup || "O+");
  const [available, setAvailable] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!region) return;
    setSubmitting(true);
    try {
      const res = await fetch(API.bloodDonorRegister, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          bloodGroup,
          donorAvailable: available,
          lat: region.latitude,
          lng: region.longitude,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to save donor profile");

      onSaved();
      Alert.alert("You're a donor!", "Thank you — nearby requests can now find you.");
    } catch (err: any) {
      Alert.alert("Couldn't save", err.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeaderRow}>
            <View>
              <Text style={styles.modalTitle}>Become a Donor</Text>
              <Text style={styles.modalSubtitle}>Help save a life nearby</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Your blood group *</Text>
          <View style={styles.chipRowWrap}>
            {BLOOD_GROUPS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.pickChip, bloodGroup === g && styles.pickChipActive]}
                onPress={() => setBloodGroup(g)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.pickChipText, bloodGroup === g && styles.pickChipTextActive]}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.availabilityRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.fieldLabelNoMargin}>Currently available to donate</Text>
              <Text style={styles.availabilityHint}>
                Toggle off anytime if you're not ready to donate
              </Text>
            </View>
            <Switch
              value={available}
              onValueChange={setAvailable}
              trackColor={{ false: COLORS.borderStrong, true: COLORS.primarySoft }}
              thumbColor={available ? COLORS.primary : "#FFFFFF"}
              ios_backgroundColor={COLORS.borderStrong}
            />
          </View>

          <View style={styles.helperBox}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.helperText}>
              Your current location will be saved so nearby blood requests can find you.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    backgroundColor: COLORS.primarySoft,
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
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 20 },
  headerTitle: { fontSize: 21, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 1 },

  tabSwitch: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 13,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: COLORS.surface,
    ...shadow(0.06, 4, 2),
  },
  tabBtnText: { fontSize: 13.5, fontWeight: "600", color: COLORS.textMuted },
  tabBtnTextActive: { color: COLORS.text },

  chipScroll: { flexGrow: 0, marginBottom: 12 },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
  chipTextActive: { color: "#FFFFFF" },

  listContent: { paddingHorizontal: 20, paddingBottom: 150, gap: 12 },

  emptyState: { alignItems: "center", paddingTop: 64, paddingHorizontal: 20 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
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
  cardTopRow: { flexDirection: "row", alignItems: "flex-start" },
  cardHeaderText: { flex: 1, marginLeft: 12, marginRight: 8 },
  groupBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  groupBadgeDonor: {
    backgroundColor: COLORS.successSoft,
    borderColor: "#BFEAD9",
  },
  groupBadgeText: { fontSize: 13.5, fontWeight: "800", color: COLORS.primary },
  groupBadgeTextDonor: { color: COLORS.success },

  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  cardSubtitle: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 3 },
  cardNotes: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 12,
    lineHeight: 18,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 10,
    padding: 10,
  },

  urgencyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  urgencyText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },

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
    backgroundColor: COLORS.success,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    gap: 6,
  },
  callBtnText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "700" },

  fabRow: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 10,
  },
  fab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 7,
    ...shadow(0.12, 12, 5),
  },
  fabPrimary: { backgroundColor: COLORS.primary },
  fabPrimaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  fabSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    shadowOpacity: 0.06,
  },
  fabSecondaryText: { color: COLORS.primary, fontSize: 14, fontWeight: "700" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,17,21,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.borderStrong,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalTitle: { fontSize: 19, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 3 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },

  fieldLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldLabelNoMargin: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceMuted,
  },
  textArea: { height: 84, textAlignVertical: "top" },

  chipRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickChip: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
  },
  pickChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pickChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "capitalize",
  },
  pickChipTextActive: { color: "#FFFFFF" },

  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  availabilityHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 3, lineHeight: 16 },

  helperBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 16,
    marginBottom: 6,
  },
  helperText: { flex: 1, fontSize: 12, color: COLORS.textFaint, lineHeight: 17 },

  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
    ...shadow(0.15, 10, 4),
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "@/components/ll-text";
import { SafeAreaView } from "react-native-safe-area-context";

import { BASE_URL, useAuth } from "@/context/AuthContext";
import { LL } from "@/constants/lifelink-theme";

type Incident = {
  _id: string;
  emergencyType: string;
  status: string;
  message?: string;
  location: { lat: number; lng: number };
  createdAt: string;
  user?: { name?: string; phone?: string; email?: string };
  respondingOfficer?: { name?: string; orgName?: string };
  notifiedPolice?: { officer: string; distanceKm: number }[];
  notifiedAgencies?: { agency: string; role: string; distanceKm: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: LL.statusPending,
  DISPATCHED: LL.statusDispatched,
  ACCEPTED: LL.statusAccepted,
  RESOLVED: LL.statusResolved,
  CANCELLED: LL.statusCancelled,
};

export default function AgencyReportsScreen({ role }: { role: string }) {
  const { authHeaders, user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/agency/incidents`, {
        headers: authHeaders(),
      });
      const body = await res.json();
      if (res.ok) setIncidents(body.incidents || []);
    } catch (err) {
      console.warn("Failed to load incidents", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchIncidents();
    // Simple polling so new SOS alerts show up without a manual pull-to-refresh.
    const interval = setInterval(fetchIncidents, 20000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  const act = async (id: string, action: "accept" | "resolve") => {
    try {
      setActingOn(id);
      await fetch(`${BASE_URL}/api/agency/incidents/${id}/${action}`, {
        method: "POST",
        headers: authHeaders(),
      });
      await fetchIncidents();
    } catch (err) {
      console.warn(`Failed to ${action} incident`, err);
    } finally {
      setActingOn(null);
    }
  };

  const openMap = (lat: number, lng: number) => {
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
  };

  const distanceFor = (incident: Incident): number | null => {
    if (!user) return null;

    // Every role (police, hospital, fire station) is listed here.
    const mine = incident.notifiedAgencies?.find(
      (n) => String(n.agency) === user.id
    );
    if (mine) return mine.distanceKm;

    // Incidents created before notifiedAgencies existed.
    const legacy = incident.notifiedPolice?.find(
      (n) => String(n.officer) === user.id
    );
    return legacy ? legacy.distanceKm : null;
  };

  const renderItem = ({ item }: { item: Incident }) => {
    const distanceKm = distanceFor(item);
    const statusColor = STATUS_COLORS[item.status] || LL.statusCancelled;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.type}>{item.emergencyType}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.victim}>{item.user?.name || "Unknown reporter"}</Text>
        {item.user?.phone ? (
          <Text style={styles.meta}>📞 {item.user.phone}</Text>
        ) : null}
        {distanceKm !== null && (
          <Text style={styles.meta}>📍 {distanceKm.toFixed(1)} km away</Text>
        )}
        {item.message ? <Text style={styles.message}>"{item.message}"</Text> : null}
        <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>

        {item.respondingOfficer?.name && (
          <Text style={styles.responder}>
            Responding: {item.respondingOfficer.name}
          </Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => openMap(item.location.lat, item.location.lng)}
          >
            <Text style={styles.mapButtonText}>Open in Maps</Text>
          </TouchableOpacity>

          {role === "police" && item.status === "DISPATCHED" && (
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => act(item._id, "accept")}
              disabled={actingOn === item._id}
            >
              <Text style={styles.acceptText}>
                {actingOn === item._id ? "..." : "Accept"}
              </Text>
            </TouchableOpacity>
          )}

          {["ACCEPTED", "DISPATCHED", "PENDING"].includes(item.status) &&
            role !== "pharmacy" && (
              <TouchableOpacity
                style={styles.resolveButton}
                onPress={() => act(item._id, "resolve")}
                disabled={actingOn === item._id}
              >
                <Text style={styles.resolveText}>
                  {actingOn === item._id ? "..." : "Resolve"}
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={LL.danger} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>Reports</Text>

      <FlatList
        data={incidents}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No reports right now.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    fontSize: 22,
    fontWeight: "900",
    color: LL.text,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  list: { padding: 16, paddingTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { color: LL.textMuted, fontSize: 14 },
  card: {
    backgroundColor: LL.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: LL.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  type: { fontSize: 13, fontWeight: "800", color: LL.dangerText, letterSpacing: 0.5 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: LL.white, fontSize: 11, fontWeight: "800" },
  victim: { fontSize: 16, fontWeight: "800", color: LL.text, marginTop: 2 },
  meta: { fontSize: 13, color: LL.textSoft, marginTop: 2 },
  message: { fontSize: 13, color: LL.textSoft, marginTop: 6, fontStyle: "italic" },
  time: { fontSize: 11.5, color: LL.textDim, marginTop: 8 },
  responder: { fontSize: 12.5, color: LL.accent, marginTop: 4, fontWeight: "700" },
  actions: { flexDirection: "row", marginTop: 12, gap: 10 },
  mapButton: {
    flex: 1,
    backgroundColor: LL.elevated,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  mapButtonText: { color: LL.text, fontWeight: "700", fontSize: 13 },
  acceptButton: {
    flex: 1,
    backgroundColor: LL.accent,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptText: { color: LL.white, fontWeight: "700", fontSize: 13 },
  resolveButton: {
    flex: 1,
    backgroundColor: LL.accent,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  resolveText: { color: LL.white, fontWeight: "700", fontSize: 13 },
});
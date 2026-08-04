import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BASE_URL, useAuth } from "@/context/AuthContext";

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
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#D97706",
  DISPATCHED: "#DC2626",
  ACCEPTED: "#2563EB",
  RESOLVED: "#16A34A",
  CANCELLED: "#6B7280",
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
    if (role !== "police" || !incident.notifiedPolice || !user) return null;
    const mine = incident.notifiedPolice.find((n) => String(n.officer) === user.id);
    return mine ? mine.distanceKm : null;
  };

  const renderItem = ({ item }: { item: Incident }) => {
    const distanceKm = distanceFor(item);
    const statusColor = STATUS_COLORS[item.status] || "#6B7280";

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
          <ActivityIndicator size="large" color="#DC2626" />
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
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  header: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  list: { padding: 16, paddingTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { color: "#6B7280", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  type: { fontSize: 13, fontWeight: "800", color: "#DC2626", letterSpacing: 0.5 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  victim: { fontSize: 16, fontWeight: "800", color: "#111827", marginTop: 2 },
  meta: { fontSize: 13, color: "#4B5563", marginTop: 2 },
  message: { fontSize: 13, color: "#374151", marginTop: 6, fontStyle: "italic" },
  time: { fontSize: 11.5, color: "#9CA3AF", marginTop: 8 },
  responder: { fontSize: 12.5, color: "#2563EB", marginTop: 4, fontWeight: "700" },
  actions: { flexDirection: "row", marginTop: 12, gap: 10 },
  mapButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  mapButtonText: { color: "#111827", fontWeight: "700", fontSize: 13 },
  acceptButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  resolveButton: {
    flex: 1,
    backgroundColor: "#16A34A",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  resolveText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
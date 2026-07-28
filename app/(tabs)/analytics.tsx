import { useCallback, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BASE_URL, useAuth } from "@/context/AuthContext";

// Where the "add / verify health records" flow lives. This is the portal
// site (same one used for role approvals) - point it at wherever that ends
// up deployed. Falls back to localhost for local dev.
const PORTAL_URL =
  process.env.EXPO_PUBLIC_PORTAL_URL || "https://lifelinkportalbackend.vercel.app/";

type RecommendationCategory =
  | "nutrition"
  | "exercise"
  | "sleep"
  | "mental"
  | "general";

type Recommendation = {
  category: RecommendationCategory;
  tip: string;
};

type HealthReport = {
  status: "none" | "pending" | "ready";
  summary?: string;
  recommendations?: Recommendation[];
  watchOutFor?: string[];
  updatedAt?: string;
};

const CATEGORY_META: Record<
  RecommendationCategory,
  { emoji: string; label: string; color: string }
> = {
  nutrition: { emoji: "🥗", label: "Nutrition", color: "#059669" },
  exercise: { emoji: "🏃", label: "Exercise", color: "#2563EB" },
  sleep: { emoji: "😴", label: "Sleep", color: "#7C3AED" },
  mental: { emoji: "🧠", label: "Mental Wellbeing", color: "#EA580C" },
  general: { emoji: "💡", label: "General", color: "#4B5563" },
};

export default function Analytics() {
  const { token, authHeaders } = useAuth();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    if (!token) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`${BASE_URL}/api/health/report`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to load your health report");
      }

      const data: HealthReport = await res.json();
      setReport(data);
    } catch (err: any) {
      setErrorMsg(
        err.message || "Something went wrong loading your health report.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, authHeaders]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  const openPortal = async (path: string) => {
    // Passing the token as a query param is a placeholder for local testing.
    // Once the portal's health-records flow exists, swap this for a
    // short-lived one-time link fetched from the backend instead of
    // exposing the main session token in a URL.
    const url = `${PORTAL_URL}${path}?token=${encodeURIComponent(
      token ?? "",
    )}`;
    await WebBrowser.openBrowserAsync(url);
    // The user may have added/updated records while the browser was open.
    loadReport();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={[styles.subtitle, { marginTop: 12 }]}>
          Loading your analytics…
        </Text>
      </View>
    );
  }

  const status = report?.status ?? "none";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.heading}>Analytics</Text>
      <Text style={styles.subheading}>
        Your personalized health snapshot, based on the records you've added.
      </Text>

      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {status === "none" && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🩺</Text>
          <Text style={styles.emptyTitle}>No health records yet</Text>
          <Text style={styles.emptyText}>
            Add and verify your health records on the LifeLink web portal.
            We'll analyze them and give you a daily summary of what to do to
            stay balanced.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => openPortal("/health-records")}
          >
            <Text style={styles.primaryButtonText}>Add Health Records</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "pending" && (
        <View style={styles.emptyCard}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={[styles.emptyTitle, { marginTop: 16 }]}>
            Analyzing your records
          </Text>
          <Text style={styles.emptyText}>
            This usually takes a minute or two. Pull down to refresh, or
            check back shortly.
          </Text>
        </View>
      )}

      {status === "ready" && report && (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Summary</Text>
            <Text style={styles.summaryText}>{report.summary}</Text>
            {report.updatedAt && (
              <Text style={styles.updatedText}>
                Last updated{" "}
                {new Date(report.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            )}
          </View>

          {report.recommendations && report.recommendations.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Daily Recommendations</Text>
              {report.recommendations.map((rec, idx) => {
                const meta = CATEGORY_META[rec.category] ?? CATEGORY_META.general;
                return (
                  <View key={idx} style={styles.recCard}>
                    <View
                      style={[
                        styles.recIconWrap,
                        { backgroundColor: `${meta.color}1A` },
                      ]}
                    >
                      <Text style={styles.recEmoji}>{meta.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recCategory, { color: meta.color }]}>
                        {meta.label}
                      </Text>
                      <Text style={styles.recTip}>{rec.tip}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {report.watchOutFor && report.watchOutFor.length > 0 && (
            <View style={styles.watchCard}>
              <Text style={styles.watchTitle}>⚠️ Keep an eye on</Text>
              {report.watchOutFor.map((item, idx) => (
                <Text key={idx} style={styles.watchItem}>
                  •  {item}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => openPortal("/health-records")}
          >
            <Text style={styles.secondaryButtonText}>Update Health Records</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 48 },
  centered: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center" },

  heading: { fontSize: 26, fontWeight: "800", color: "#111827" },
  subheading: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 20,
  },

  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#991B1B", fontSize: 13, textAlign: "center" },

  emptyCard: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 28,
    marginTop: 12,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },

  primaryButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },

  secondaryButton: {
    marginTop: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryButtonText: { color: "#111827", fontWeight: "700", fontSize: 14 },

  summaryCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryText: { color: "#F9FAFB", fontSize: 15, lineHeight: 22 },
  updatedText: { color: "#6B7280", fontSize: 12, marginTop: 12 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },

  recCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  recIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  recEmoji: { fontSize: 17 },
  recCategory: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  recTip: { fontSize: 14, color: "#374151", lineHeight: 19 },

  watchCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  watchTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 8,
  },
  watchItem: { fontSize: 13, color: "#92400E", lineHeight: 20 },
});
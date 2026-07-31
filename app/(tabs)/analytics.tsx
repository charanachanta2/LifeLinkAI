import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { API } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

// ============================================================
// TYPES
// ============================================================

type AIRecommendation = {
  category:
    | "nutrition"
    | "exercise"
    | "sleep"
    | "mental"
    | "general";

  tip: string;
};

type DoctorRecommendation = {
  recordId: string;
  hospitalName: string;
  doctorName: string;
  recordDate: string;
  recommendation: string;
};

type Measurements = {
  bloodPressure: string | null;
  heartRate: number | null;
  bloodSugar: number | null;
  weight: number | null;
};

type AnalyticsResponse =
  | {
      status: "none";
    }
  | {
      status: "ready";

      totalRecords: number;

      summary: string;

      measurements: Measurements;

      doctorRecommendations: DoctorRecommendation[];

      recommendations: AIRecommendation[];

      watchOutFor: string[];

      updatedAt: string;
    };

// ============================================================
// ANALYTICS
// ============================================================

export default function Analytics() {
  const { token, authHeaders } = useAuth();

  const [data, setData] =
    useState<AnalyticsResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // ==========================================================
  // LOAD ANALYTICS
  // ==========================================================

  const loadAnalytics = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setError(null);

    try {
      const response = await fetch(
        API.healthReport,
        {
          method: "GET",
          headers: authHeaders(),
        }
      );

      const body = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          body.message ||
            "Failed to load health analytics."
        );
      }

      setData(body as AnalyticsResponse);
    } catch (err: any) {
      console.error(
        "Health analytics error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load health analytics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, authHeaders]);

  // ==========================================================
  // REFRESH WHEN TAB OPENS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [loadAnalytics])
  );

  // ==========================================================
  // PULL TO REFRESH
  // ==========================================================

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color="#DC2626"
        />

        <Text style={styles.loadingText}>
          Analyzing your health records...
        </Text>

        <Text style={styles.loadingSubtext}>
          LifeLink AI is preparing your health
          overview.
        </Text>
      </View>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#DC2626"
        />
      }
    >
      {/* HEADER */}

      <Text style={styles.heading}>
        Health Analytics
      </Text>

      <Text style={styles.subheading}>
        Your medical records, doctor guidance and
        AI-generated health overview in one place.
      </Text>

      {/* ERROR */}

      {error && (
        <View style={styles.errorCard}>
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color="#B91C1C"
          />

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      {/* NO RECORDS */}

      {!error &&
        data?.status === "none" && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>
              🩺
            </Text>

            <Text style={styles.emptyTitle}>
              No health data yet
            </Text>

            <Text style={styles.emptyText}>
              When your hospital adds medical
              reports to your LifeLink account,
              your analytics and AI health
              summary will appear here.
            </Text>
          </View>
        )}

      {/* READY */}

      {!error &&
        data?.status === "ready" && (
          <>
            {/* OVERVIEW */}

            <View style={styles.overviewCard}>
              <View style={styles.overviewTop}>
                <View>
                  <Text style={styles.overviewLabel}>
                    CONNECTED HEALTH RECORDS
                  </Text>

                  <Text style={styles.overviewNumber}>
                    {data.totalRecords}
                  </Text>
                </View>

                <View style={styles.overviewIcon}>
                  <Ionicons
                    name="document-text-outline"
                    size={25}
                    color="#FFFFFF"
                  />
                </View>
              </View>

              <Text style={styles.overviewText}>
                {data.totalRecords === 1
                  ? "1 medical record is"
                  : `${data.totalRecords} medical records are`}{" "}
                connected to your LifeLink account.
              </Text>
            </View>

            {/* ==================================================
                MEASUREMENTS
            ================================================== */}

            <SectionHeading
              icon="pulse-outline"
              title="Latest Measurements"
            />

            <View style={styles.measurementGrid}>
              <MeasurementCard
                icon="heart-outline"
                label="Blood Pressure"
                value={
                  data.measurements
                    .bloodPressure || "—"
                }
                unit=""
              />

              <MeasurementCard
                icon="pulse-outline"
                label="Heart Rate"
                value={
                  data.measurements
                    .heartRate ?? "—"
                }
                unit={
                  data.measurements
                    .heartRate !== null
                    ? "bpm"
                    : ""
                }
              />

              <MeasurementCard
                icon="water-outline"
                label="Blood Sugar"
                value={
                  data.measurements
                    .bloodSugar ?? "—"
                }
                unit={
                  data.measurements
                    .bloodSugar !== null
                    ? "mg/dL"
                    : ""
                }
              />

              <MeasurementCard
                icon="body-outline"
                label="Weight"
                value={
                  data.measurements.weight ??
                  "—"
                }
                unit={
                  data.measurements.weight !==
                  null
                    ? "kg"
                    : ""
                }
              />
            </View>

            {/* ==================================================
                DOCTOR RECOMMENDATIONS
            ================================================== */}

            <SectionHeading
              icon="medkit-outline"
              title="Doctor Recommendations"
            />

            {data.doctorRecommendations
              .length === 0 ? (
              <View
                style={styles.noRecommendation}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#6B7280"
                />

                <Text
                  style={
                    styles.noRecommendationText
                  }
                >
                  No recommendations have been
                  added by your healthcare
                  providers yet.
                </Text>
              </View>
            ) : (
              data.doctorRecommendations.map(
                (item) => (
                  <View
                    key={item.recordId}
                    style={
                      styles.doctorCard
                    }
                  >
                    <View
                      style={
                        styles.doctorHeader
                      }
                    >
                      <View
                        style={
                          styles.doctorIcon
                        }
                      >
                        <Ionicons
                          name="medical-outline"
                          size={20}
                          color="#DC2626"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={
                            styles.doctorHospital
                          }
                        >
                          {item.hospitalName ||
                            "Healthcare Provider"}
                        </Text>

                        {item.doctorName ? (
                          <Text
                            style={
                              styles.doctorName
                            }
                          >
                            {item.doctorName}
                          </Text>
                        ) : null}

                        {item.recordDate ? (
                          <Text
                            style={
                              styles.doctorDate
                            }
                          >
                            {item.recordDate}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <Text
                      style={
                        styles.doctorRecommendation
                      }
                    >
                      {item.recommendation}
                    </Text>
                  </View>
                )
              )
            )}

            {/* ==================================================
                AI SUMMARY
            ================================================== */}

            <SectionHeading
              icon="sparkles-outline"
              title="AI Health Summary"
            />

            <View style={styles.aiCard}>
              <View style={styles.aiHeading}>
                <View style={styles.aiIcon}>
                  <Ionicons
                    name="sparkles"
                    size={20}
                    color="#FFFFFF"
                  />
                </View>

                <View>
                  <Text style={styles.aiTitle}>
                    LifeLink AI
                  </Text>

                  <Text
                    style={styles.aiSubtitle}
                  >
                    Based on your connected
                    health records
                  </Text>
                </View>
              </View>

              <Text style={styles.aiText}>
                {data.summary}
              </Text>
            </View>

            {/* ==================================================
                AI RECOMMENDATIONS
            ================================================== */}

            <SectionHeading
              icon="bulb-outline"
              title="AI Wellness Suggestions"
            />

            {data.recommendations.length ===
            0 ? (
              <View
                style={styles.noRecommendation}
              >
                <Text
                  style={
                    styles.noRecommendationText
                  }
                >
                  No additional wellness
                  suggestions are available.
                </Text>
              </View>
            ) : (
              data.recommendations.map(
                (recommendation, index) => (
                  <View
                    key={`${recommendation.category}-${index}`}
                    style={
                      styles.aiRecommendationCard
                    }
                  >
                    <View
                      style={
                        styles.categoryIcon
                      }
                    >
                      <Ionicons
                        name={getCategoryIcon(
                          recommendation.category
                        )}
                        size={19}
                        color="#92400E"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={
                          styles.categoryTitle
                        }
                      >
                        {formatCategory(
                          recommendation.category
                        )}
                      </Text>

                      <Text
                        style={
                          styles.recommendationText
                        }
                      >
                        {recommendation.tip}
                      </Text>
                    </View>
                  </View>
                )
              )
            )}

            {/* ==================================================
                WATCH OUT
            ================================================== */}

            {data.watchOutFor.length > 0 && (
              <>
                <SectionHeading
                  icon="eye-outline"
                  title="Keep an Eye On"
                />

                <View
                  style={styles.watchCard}
                >
                  {data.watchOutFor.map(
                    (item, index) => (
                      <View
                        key={index}
                        style={[
                          styles.watchRow,
                          index ===
                            data.watchOutFor
                              .length -
                              1 &&
                            styles.watchRowLast,
                        ]}
                      >
                        <Ionicons
                          name="alert-circle-outline"
                          size={19}
                          color="#B45309"
                        />

                        <Text
                          style={
                            styles.watchText
                          }
                        >
                          {item}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </>
            )}

            {/* DISCLAIMER */}

            <View style={styles.disclaimer}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#6B7280"
              />

              <Text
                style={styles.disclaimerText}
              >
                LifeLink AI provides
                informational summaries and
                general wellness suggestions.
                It does not replace advice from
                a qualified healthcare
                professional.
              </Text>
            </View>
          </>
        )}
    </ScrollView>
  );
}

// ============================================================
// SECTION HEADING
// ============================================================

function SectionHeading({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Ionicons
        name={icon}
        size={20}
        color="#111827"
      />

      <Text style={styles.sectionTitle}>
        {title}
      </Text>
    </View>
  );
}

// ============================================================
// MEASUREMENT CARD
// ============================================================

function MeasurementCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  unit: string;
}) {
  return (
    <View style={styles.measurementCard}>
      <View style={styles.measurementIcon}>
        <Ionicons
          name={icon}
          size={21}
          color="#DC2626"
        />
      </View>

      <Text style={styles.measurementLabel}>
        {label}
      </Text>

      <Text style={styles.measurementValue}>
        {value}
      </Text>

      {unit ? (
        <Text style={styles.measurementUnit}>
          {unit}
        </Text>
      ) : null}
    </View>
  );
}

// ============================================================
// HELPERS
// ============================================================

function formatCategory(category: string) {
  switch (category) {
    case "nutrition":
      return "Nutrition";

    case "exercise":
      return "Exercise";

    case "sleep":
      return "Sleep";

    case "mental":
      return "Mental Wellness";

    default:
      return "General Wellness";
  }
}

function getCategoryIcon(
  category: string
): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case "nutrition":
      return "nutrition-outline";

    case "exercise":
      return "fitness-outline";

    case "sleep":
      return "moon-outline";

    case "mental":
      return "happy-outline";

    default:
      return "bulb-outline";
  }
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 60,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: "#FFFFFF",
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },

  loadingSubtext: {
    marginTop: 5,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },

  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },

  subheading: {
    marginTop: 6,
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
  },

  errorText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    color: "#B91C1C",
  },

  emptyCard: {
    alignItems: "center",
    marginTop: 15,
    padding: 32,
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
  },

  emptyEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: "#6B7280",
  },

  overviewCard: {
    marginBottom: 28,
    padding: 20,
    backgroundColor: "#111827",
    borderRadius: 18,
  },

  overviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  overviewLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: "#9CA3AF",
  },

  overviewNumber: {
    marginTop: 4,
    fontSize: 38,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  overviewIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },

  overviewText: {
    marginTop: 3,
    fontSize: 13,
    color: "#9CA3AF",
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 13,
  },

  sectionTitle: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  measurementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 23,
  },

  measurementCard: {
    width: "48%",
    marginBottom: 12,
    padding: 15,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 16,
  },

  measurementIcon: {
    width: 36,
    height: 36,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 11,
  },

  measurementLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },

  measurementValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  measurementUnit: {
    marginTop: 1,
    fontSize: 10,
    color: "#9CA3AF",
  },

  noRecommendation: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
  },

  noRecommendationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
  },

  doctorCard: {
    marginBottom: 13,
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 16,
  },

  doctorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  doctorIcon: {
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  doctorHospital: {
    fontSize: 13,
    fontWeight: "800",
    color: "#991B1B",
  },

  doctorName: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
  },

  doctorDate: {
    marginTop: 2,
    fontSize: 10,
    color: "#9CA3AF",
  },

  doctorRecommendation: {
    fontSize: 13,
    lineHeight: 20,
    color: "#7F1D1D",
  },

  aiCard: {
    marginBottom: 25,
    padding: 18,
    backgroundColor: "#111827",
    borderRadius: 18,
  },

  aiHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  aiIcon: {
    width: 38,
    height: 38,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },

  aiTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  aiSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: "#9CA3AF",
  },

  aiText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#E5E7EB",
  },

  aiRecommendationCard: {
    flexDirection: "row",
    marginBottom: 11,
    padding: 15,
    backgroundColor: "#FFFBEB",
    borderRadius: 15,
  },

  categoryIcon: {
    width: 38,
    height: 38,
    marginRight: 11,
    borderRadius: 11,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },

  categoryTitle: {
    marginBottom: 3,
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },

  recommendationText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#78350F",
  },

  watchCard: {
    marginBottom: 25,
    paddingHorizontal: 15,
    backgroundColor: "#FFF7ED",
    borderRadius: 15,
  },

  watchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#FED7AA",
  },

  watchRowLast: {
    borderBottomWidth: 0,
  },

  watchText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    lineHeight: 19,
    color: "#9A3412",
  },

  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    padding: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
  },

  disclaimerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 17,
    color: "#6B7280",
  },
});
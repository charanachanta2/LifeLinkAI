import { loadCrashModel } from "@/utils/CrashModel";
import { startSensors, stopSensors } from "@/utils/SensorManager";
import { registerEmergencyCallback } from "@/utils/EmergencyManager";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";

import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  BASE_URL,
  useAuth,
} from "@/context/AuthContext";


// ============================================================
// TYPES
// ============================================================

type MedicalRecord = {
  id: string;

  title: string;

  recordType: string;

  hospitalName: string;

  doctorName: string;

  recordDate: string;

  bloodPressure: string;

  heartRate: number | null;

  bloodSugar: number | null;

  weight: number | null;

  notes: string;

  recommendations: string;

  createdBy: string;

  hasPdf: boolean;

  pdf: {
    filename?: string | null;
    contentType?: string;
    size?: number;
  } | null;

  createdAt?: string | null;

  updatedAt?: string | null;
};


type RecordsResponse = {
  count: number;
  records: MedicalRecord[];
};


// ============================================================
// HOME
// ============================================================

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function initializeCrashDetection() {
      await loadCrashModel();

      if (!mounted) return;

      registerEmergencyCallback(() => {
        console.log("🚨 Emergency Callback Fired");
        router.push("/emergency" as Href);
      });

      startSensors();

      console.log("✅ Crash Detection Ready");
    }

    initializeCrashDetection();

    return () => {
      mounted = false;
      stopSensors();
    };
  }, []);


  const {
    user,
    token,
    authHeaders,
  } = useAuth();


  const [
    records,
    setRecords,
  ] = useState<MedicalRecord[]>([]);


  const [
    expandedRecord,
    setExpandedRecord,
  ] = useState<string | null>(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );


  // ==========================================================
  // LOAD REPORTS
  // ==========================================================

  const loadRecords =
    useCallback(
      async () => {
        if (!token) {
          setLoading(false);
          return;
        }

        setError(null);

        try {
          const response =
            await fetch(
              `${BASE_URL}/api/health/records`,
              {
                headers:
                  authHeaders(),
              }
            );


          const body =
            await response
              .json()
              .catch(
                () => ({})
              );


          if (!response.ok) {
            throw new Error(
              body.message ||
              "Failed to load medical records"
            );
          }


          const data =
            body as RecordsResponse;


          setRecords(
            data.records || []
          );

        } catch (err: any) {
          setError(
            err.message ||
            "Unable to load medical records."
          );

        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        token,
        authHeaders,
      ]
    );


  // Refresh every time Home becomes active.

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );


  // ==========================================================
  // REFRESH
  // ==========================================================

  const onRefresh = () => {
    setRefreshing(true);

    loadRecords();
  };


  // ==========================================================
  // EXPAND
  // ==========================================================

  const toggleRecord = (
    id: string
  ) => {
    setExpandedRecord(
      current =>
        current === id
          ? null
          : id
    );
  };


  // ==========================================================
  // DATE
  // ==========================================================

  const formatDate = (
    value?: string | null
  ) => {
    if (!value) {
      return "Date unavailable";
    }


    // YYYY-MM-DD avoids timezone issues.

    const parts =
      value.split("-");


    if (parts.length === 3) {
      const date =
        new Date(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2])
        );


      return date.toLocaleDateString(
        undefined,
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    }


    return value;
  };


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
    >

      {/* TOP BAR */}

      <View style={styles.topBar}>

        <View>

          <Text style={styles.brand}>
            Life
            <Text
              style={styles.brandAccent}
            >
              Link
            </Text>
          </Text>

        </View>


        <TouchableOpacity
          style={
            styles.profileButton
          }
          onPress={() =>
            router.push("/profile")
          }
          accessibilityLabel="Open profile"
        >

          <Ionicons
            name="person-circle-outline"
            size={34}
            color="#111827"
          />

        </TouchableOpacity>

      </View>


      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#DC2626"
          />
        }
      >

        {/* WELCOME */}

        <View
          style={
            styles.welcomeSection
          }
        >

          <Text
            style={styles.emoji}
          >
            👋
          </Text>


          <View style={{ flex: 1 }}>

            <Text
              style={styles.title}
            >
              Welcome
              {user?.name
                ? `, ${user.name}`
                : ""}
              !
            </Text>


            <Text
              style={styles.subtitle}
            >
              Here's your LifeLink
              health overview.
            </Text>

          </View>

        </View>


        {/* MEDICAL REPORT HEADING */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <View>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Medical Reports
            </Text>


            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Reports shared by your
              healthcare providers
            </Text>

          </View>


          {records.length > 0 && (
            <View
              style={
                styles.countBadge
              }
            >

              <Text
                style={
                  styles.countText
                }
              >
                {records.length}
              </Text>

            </View>
          )}

        </View>


        {/* LOADING */}

        {loading && (
          <View
            style={
              styles.loadingCard
            }
          >

            <ActivityIndicator
              size="small"
              color="#DC2626"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading your reports...
            </Text>

          </View>
        )}


        {/* ERROR */}

        {!loading && error && (
          <View
            style={styles.errorCard}
          >

            <Ionicons
              name="alert-circle-outline"
              size={22}
              color="#B91C1C"
            />

            <Text
              style={styles.errorText}
            >
              {error}
            </Text>

          </View>
        )}


        {/* EMPTY */}

        {!loading &&
          !error &&
          records.length === 0 && (
            <View
              style={
                styles.emptyCard
              }
            >

              <Text
                style={
                  styles.emptyEmoji
                }
              >
                🏥
              </Text>


              <Text
                style={
                  styles.emptyTitle
                }
              >
                No medical reports yet
              </Text>


              <Text
                style={
                  styles.emptyText
                }
              >
                Reports added by your
                hospital will automatically
                appear here.
              </Text>

            </View>
          )}


        {/* RECORDS */}

        {!loading &&
          records.map(
            (
              record,
              index
            ) => {

              const expanded =
                expandedRecord ===
                record.id;


              return (
                <View
                  key={record.id}
                  style={
                    styles.reportCard
                  }
                >

                  {/* NEW BADGE */}

                  {index === 0 && (
                    <View
                      style={
                        styles.newBadge
                      }
                    >

                      <Text
                        style={
                          styles.newBadgeText
                        }
                      >
                        LATEST
                      </Text>

                    </View>
                  )}


                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() =>
                      toggleRecord(
                        record.id
                      )
                    }
                  >

                    <View
                      style={
                        styles.reportHeader
                      }
                    >

                      <View
                        style={
                          styles.hospitalIcon
                        }
                      >

                        <Ionicons
                          name="medical"
                          size={21}
                          color="#DC2626"
                        />

                      </View>


                      <View
                        style={
                          styles.reportInfo
                        }
                      >

                        <Text
                          style={
                            styles.hospitalName
                          }
                        >
                          {record.hospitalName ||
                            "Healthcare Provider"}
                        </Text>


                        <Text
                          style={
                            styles.reportTitle
                          }
                        >
                          {record.title ||
                            "Medical Report"}
                        </Text>


                        <Text
                          style={
                            styles.reportDate
                          }
                        >
                          {formatDate(
                            record.recordDate
                          )}
                        </Text>

                      </View>


                      <Ionicons
                        name={
                          expanded
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={21}
                        color="#6B7280"
                      />

                    </View>

                  </TouchableOpacity>


                  {/* EXPANDED */}

                  {expanded && (
                    <View
                      style={
                        styles.expandedArea
                      }
                    >

                      {record.doctorName ? (
                        <DetailRow
                          icon="person-outline"
                          label="Doctor"
                          value={
                            record.doctorName
                          }
                        />
                      ) : null}


                      {record.bloodPressure ? (
                        <DetailRow
                          icon="heart-outline"
                          label="Blood Pressure"
                          value={
                            record.bloodPressure
                          }
                        />
                      ) : null}


                      {record.heartRate !==
                        null && (
                        <DetailRow
                          icon="pulse-outline"
                          label="Heart Rate"
                          value={`${record.heartRate} bpm`}
                        />
                      )}


                      {record.bloodSugar !==
                        null && (
                        <DetailRow
                          icon="water-outline"
                          label="Blood Sugar"
                          value={`${record.bloodSugar} mg/dL`}
                        />
                      )}


                      {record.weight !==
                        null && (
                        <DetailRow
                          icon="body-outline"
                          label="Weight"
                          value={`${record.weight} kg`}
                        />
                      )}


                      {record.notes ? (
                        <View
                          style={
                            styles.textSection
                          }
                        >

                          <Text
                            style={
                              styles.detailHeading
                            }
                          >
                            Doctor Notes
                          </Text>

                          <Text
                            style={
                              styles.detailText
                            }
                          >
                            {record.notes}
                          </Text>

                        </View>
                      ) : null}


                      {record.recommendations ? (
                        <View
                          style={
                            styles.recommendationBox
                          }
                        >

                          <View
                            style={
                              styles.recommendationHeading
                            }
                          >

                            <Ionicons
                              name="bulb-outline"
                              size={18}
                              color="#92400E"
                            />

                            <Text
                              style={
                                styles.recommendationTitle
                              }
                            >
                              Doctor Recommendations
                            </Text>

                          </View>


                          <Text
                            style={
                              styles.recommendationText
                            }
                          >
                            {
                              record.recommendations
                            }
                          </Text>

                        </View>
                      ) : null}


                      {record.hasPdf && (
                        <View
                          style={
                            styles.pdfNotice
                          }
                        >

                          <Ionicons
                            name="document-text-outline"
                            size={20}
                            color="#DC2626"
                          />

                          <View
                            style={{
                              flex: 1,
                            }}
                          >

                            <Text
                              style={
                                styles.pdfTitle
                              }
                            >
                              PDF Medical Report
                            </Text>

                            <Text
                              style={
                                styles.pdfText
                              }
                            >
                              {record.pdf
                                ?.filename ||
                                "Medical report attached"}
                            </Text>

                          </View>

                        </View>
                      )}

                    </View>
                  )}

                </View>
              );
            }
          )}


        {/* ANALYTICS */}

        {records.length > 0 && (
          <TouchableOpacity
            style={
              styles.analyticsCard
            }
            onPress={() =>
              router.push(
                "/(tabs)/analytics"
              )
            }
          >

            <View
              style={
                styles.analyticsIcon
              }
            >

              <Ionicons
                name="analytics-outline"
                size={24}
                color="#FFFFFF"
              />

            </View>


            <View
              style={{ flex: 1 }}
            >

              <Text
                style={
                  styles.analyticsTitle
                }
              >
                Health Analytics
              </Text>


              <Text
                style={
                  styles.analyticsText
                }
              >
                View measurements and
                doctor recommendations
              </Text>

            </View>


            <Ionicons
              name="chevron-forward"
              size={21}
              color="#9CA3AF"
            />

          </TouchableOpacity>
        )}

      </ScrollView>

    </SafeAreaView>
  );
}


// ============================================================
// DETAIL ROW
// ============================================================

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.detailRow}
    >

      <Ionicons
        name={icon}
        size={18}
        color="#6B7280"
      />


      <Text
        style={styles.detailLabel}
      >
        {label}
      </Text>


      <Text
        style={styles.detailValue}
      >
        {value}
      </Text>

    </View>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    safeArea: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
    },


    topBar: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",

      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 8,

      borderBottomWidth: 1,
      borderBottomColor:
        "#F3F4F6",
    },


    brand: {
      fontSize: 21,
      fontWeight: "800",
      color: "#111827",
    },


    brandAccent: {
      color: "#DC2626",
    },


    profileButton: {
      padding: 4,
    },


    scroll: {
      flex: 1,
    },


    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 50,
    },


    welcomeSection: {
      flexDirection: "row",
      alignItems: "center",

      marginBottom: 32,
    },


    emoji: {
      fontSize: 38,
      marginRight: 14,
    },


    title: {
      fontSize: 25,
      fontWeight: "800",
      color: "#111827",
    },


    subtitle: {
      fontSize: 14,
      color: "#6B7280",
      marginTop: 3,
    },


    sectionHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",

      marginBottom: 14,
    },


    sectionTitle: {
      fontSize: 19,
      fontWeight: "800",
      color: "#111827",
    },


    sectionSubtitle: {
      fontSize: 13,
      color: "#6B7280",
      marginTop: 3,
    },


    countBadge: {
      minWidth: 30,
      height: 30,

      borderRadius: 15,

      backgroundColor:
        "#FEE2E2",

      alignItems: "center",
      justifyContent: "center",
    },


    countText: {
      color: "#DC2626",
      fontWeight: "800",
    },


    loadingCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      padding: 24,

      backgroundColor:
        "#F9FAFB",

      borderRadius: 16,
    },


    loadingText: {
      marginLeft: 10,
      color: "#6B7280",
    },


    errorCard: {
      flexDirection: "row",
      alignItems: "center",

      padding: 15,

      backgroundColor:
        "#FEF2F2",

      borderRadius: 14,
    },


    errorText: {
      flex: 1,

      marginLeft: 9,

      color: "#B91C1C",
      fontSize: 13,
    },


    emptyCard: {
      alignItems: "center",

      padding: 30,

      backgroundColor:
        "#F9FAFB",

      borderRadius: 18,
    },


    emptyEmoji: {
      fontSize: 40,
      marginBottom: 10,
    },


    emptyTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: "#111827",
    },


    emptyText: {
      marginTop: 6,

      fontSize: 13,
      lineHeight: 19,
      color: "#6B7280",

      textAlign: "center",
    },


    reportCard: {
      position: "relative",

      marginBottom: 13,
      padding: 16,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,
      borderColor: "#E5E7EB",

      borderRadius: 17,
    },


    newBadge: {
      position: "absolute",

      top: -7,
      right: 14,

      paddingHorizontal: 8,
      paddingVertical: 3,

      backgroundColor:
        "#DC2626",

      borderRadius: 8,

      zIndex: 10,
    },


    newBadgeText: {
      color: "#FFFFFF",

      fontSize: 9,
      fontWeight: "800",

      letterSpacing: 0.5,
    },


    reportHeader: {
      flexDirection: "row",
      alignItems: "center",
    },


    hospitalIcon: {
      width: 44,
      height: 44,

      borderRadius: 13,

      backgroundColor:
        "#FEF2F2",

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,
    },


    reportInfo: {
      flex: 1,
    },


    hospitalName: {
      fontSize: 12,
      fontWeight: "700",
      color: "#DC2626",

      marginBottom: 2,
    },


    reportTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: "#111827",
    },


    reportDate: {
      marginTop: 3,

      fontSize: 12,
      color: "#6B7280",
    },


    expandedArea: {
      marginTop: 16,
      paddingTop: 14,

      borderTopWidth: 1,
      borderTopColor:
        "#F3F4F6",
    },


    detailRow: {
      flexDirection: "row",
      alignItems: "center",

      paddingVertical: 7,
    },


    detailLabel: {
      flex: 1,

      marginLeft: 8,

      fontSize: 13,
      color: "#6B7280",
    },


    detailValue: {
      fontSize: 13,
      fontWeight: "700",
      color: "#111827",
    },


    textSection: {
      marginTop: 14,
    },


    detailHeading: {
      fontSize: 13,
      fontWeight: "700",
      color: "#111827",

      marginBottom: 5,
    },


    detailText: {
      fontSize: 13,
      lineHeight: 20,
      color: "#4B5563",
    },


    recommendationBox: {
      marginTop: 15,
      padding: 14,

      backgroundColor:
        "#FFFBEB",

      borderRadius: 13,
    },


    recommendationHeading: {
      flexDirection: "row",
      alignItems: "center",

      marginBottom: 7,
    },


    recommendationTitle: {
      marginLeft: 6,

      fontSize: 13,
      fontWeight: "700",

      color: "#92400E",
    },


    recommendationText: {
      fontSize: 13,
      lineHeight: 19,

      color: "#92400E",
    },


    pdfNotice: {
      flexDirection: "row",
      alignItems: "center",

      marginTop: 14,
      padding: 12,

      backgroundColor:
        "#FEF2F2",

      borderRadius: 12,
    },


    pdfTitle: {
      marginLeft: 9,

      fontSize: 13,
      fontWeight: "700",

      color: "#111827",
    },


    pdfText: {
      marginLeft: 9,
      marginTop: 2,

      fontSize: 11,
      color: "#6B7280",
    },


    analyticsCard: {
      flexDirection: "row",
      alignItems: "center",

      marginTop: 22,
      padding: 16,

      backgroundColor:
        "#111827",

      borderRadius: 17,
    },


    analyticsIcon: {
      width: 44,
      height: 44,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,

      backgroundColor:
        "#DC2626",

      borderRadius: 13,
    },


    analyticsTitle: {
      color: "#FFFFFF",

      fontSize: 15,
      fontWeight: "700",
    },


    analyticsText: {
      marginTop: 3,

      color: "#9CA3AF",

      fontSize: 12,
    },

  });
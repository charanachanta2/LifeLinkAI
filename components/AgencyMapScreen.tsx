import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useIsFocused } from "expo-router/react-navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import {
  ACTIVE_STATUSES,
  EMERGENCY_EMOJI,
  EMERGENCY_LABEL,
  distanceKm,
  themeFor,
  timeAgo,
} from "@/constants/agency";
import { BASE_URL, useAuth } from "@/context/AuthContext";

const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

const POLL_MS = 15000;
// Only re-save the station location if the phone moved further than this.
const RESAVE_LOCATION_KM = 0.15;
const CARD_WIDTH = 300;
const CARD_GAP = 12;

type Incident = {
  _id: string;
  emergencyType: string;
  status: string;
  message?: string;
  location: { lat: number; lng: number };
  createdAt: string;
  user?: { name?: string; phone?: string; email?: string };
  respondingOfficer?: { name?: string; orgName?: string };
};

type Pos = { lat: number; lng: number };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#D97706",
  DISPATCHED: "#DC2626",
  ACCEPTED: "#2563EB",
};

// ------------------------------------------------------------
// Leaflet page. Built once for the station position; incidents are pushed
// in afterwards with injectJavaScript so the map never reloads.
// ------------------------------------------------------------
function buildMapHtml(lat: number, lng: number, stationEmoji: string, stationColor: string, stationLabel: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .pin {
      width: 46px; height: 46px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 3px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.45);
      font-size: 24px; line-height: 1; position: relative;
    }
    .pin.selected { transform: scale(1.25); z-index: 999 !important; }
    .pin.pulse::after {
      content: ""; position: absolute; inset: -10px; border-radius: 50%;
      border: 3px solid currentColor; opacity: 0.6;
      animation: pulse 1.6s ease-out infinite;
    }
    @keyframes pulse { 0% { transform: scale(0.75); opacity: .7; } 100% { transform: scale(1.5); opacity: 0; } }
    .station {
      width: 48px; height: 48px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      border: 3px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.45);
      font-size: 26px; line-height: 1;
    }
    .tag {
      position: absolute; top: 52px; left: 50%; transform: translateX(-50%);
      background: #111827; color: #fff; font: 700 11px sans-serif;
      padding: 2px 7px; border-radius: 8px; white-space: nowrap;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 14);

    L.tileLayer('https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}', {
      attribution: '© OpenMapTiles © OpenStreetMap contributors © Geoapify',
      maxZoom: 20,
    }).addTo(map);

    const stationIcon = L.divIcon({
      className: '',
      html: '<div style="position:relative"><div class="station" style="background:${stationColor}">${stationEmoji}</div><div class="tag">${stationLabel}</div></div>',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
    let stationMarker = L.marker([${lat}, ${lng}], { icon: stationIcon, zIndexOffset: 500 }).addTo(map);

    let markers = {};
    let selectedId = null;

    function post(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }

    function buildIcon(inc, selected) {
      const cls = 'pin' + (inc.pulse ? ' pulse' : '') + (selected ? ' selected' : '');
      return L.divIcon({
        className: '',
        html: '<div class="' + cls + '" style="background:' + inc.color + ';color:' + inc.color + '"><span style="color:#000">' + inc.emoji + '</span></div>',
        iconSize: [46, 46],
        iconAnchor: [23, 23],
      });
    }

    // Called from React Native with a JSON string
    window.setIncidents = function (json, fit) {
      const list = JSON.parse(json);
      Object.values(markers).forEach((m) => map.removeLayer(m));
      markers = {};
      list.forEach((inc) => {
        const m = L.marker([inc.lat, inc.lng], { icon: buildIcon(inc, inc.id === selectedId) }).addTo(map);
        m.__inc = inc;
        m.on('click', () => post({ type: 'markerPress', id: inc.id }));
        markers[inc.id] = m;
      });
      if (fit && list.length) {
        const pts = list.map((i) => [i.lat, i.lng]).concat([[${lat}, ${lng}]]);
        map.fitBounds(pts, { padding: [70, 70], maxZoom: 16 });
      }
    };

    window.focusIncident = function (id) {
      selectedId = id;
      Object.values(markers).forEach((m) => m.setIcon(buildIcon(m.__inc, m.__inc.id === id)));
      const m = markers[id];
      if (m) map.setView(m.getLatLng(), Math.max(map.getZoom(), 15), { animate: true });
    };

    window.moveStation = function (lat, lng) {
      stationMarker.setLatLng([lat, lng]);
    };

    window.recenter = function (lat, lng) {
      map.setView([lat, lng], 15, { animate: true });
    };

    post({ type: 'ready' });
  </script>
</body>
</html>
  `;
}

// Staggered fade + rise entrance for each incident card as it mounts.
function AnimatedIncidentCard({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 360,
      delay: Math.min(index, 6) * 60,
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
              outputRange: [16, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function AgencyMapScreen({ role }: { role: string }) {
  const { user, authHeaders, updateAgencyLocation } = useAuth();
  const isFocused = useIsFocused();
  const theme = themeFor(role);

  const webviewRef = useRef<WebView>(null);
  const cardsRef = useRef<ScrollView>(null);

  const [station, setStation] = useState<Pos | null>(
    user?.location ? { lat: user.location.lat, lng: user.location.lng } : null
  );
  const [locError, setLocError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const firstFit = useRef(true);

  // ----------------------------------------------------------
  // Station location: use the phone's GPS and keep the saved one in
  // sync automatically, so the station is always reachable by SOS
  // routing and shows up for civilians without pressing any button.
  // ----------------------------------------------------------
  const syncLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        if (!user?.location) {
          setLocError(
            "Location permission is needed to show emergencies near your station."
          );
        }
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const here = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setStation(here);
      setLocError(null);

      const saved = user?.location;
      const moved =
        !saved ||
        distanceKm(saved.lat, saved.lng, here.lat, here.lng) > RESAVE_LOCATION_KM;

      if (moved) {
        await updateAgencyLocation(here.lat, here.lng).catch(() => {});
      }
    } catch (err: any) {
      if (!user?.location) {
        setLocError(err?.message || "Couldn't get your location.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncLocation();
  }, [syncLocation]);

  // ----------------------------------------------------------
  // Incidents (polled while this tab is on screen)
  // ----------------------------------------------------------
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/agency/incidents`, {
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.message || "Couldn't load emergencies");
      }

      setIncidents(body.incidents || []);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || "Couldn't load emergencies");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (!isFocused) return;

    fetchIncidents();
    const interval = setInterval(fetchIncidents, POLL_MS);
    return () => clearInterval(interval);
  }, [isFocused, fetchIncidents]);

  const active = useMemo(
    () =>
      incidents
        .filter(
          (i) =>
            ACTIVE_STATUSES.includes(i.status) &&
            i.location &&
            Number.isFinite(i.location.lat) &&
            Number.isFinite(i.location.lng)
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [incidents]
  );

  // ----------------------------------------------------------
  // Push markers into the map
  // ----------------------------------------------------------
  useEffect(() => {
    if (!mapReady || !webviewRef.current) return;

    const payload = active.map((i) => ({
      id: i._id,
      lat: i.location.lat,
      lng: i.location.lng,
      emoji: EMERGENCY_EMOJI[i.emergencyType] || "🆘",
      color: STATUS_COLORS[i.status] || "#DC2626",
      pulse: i.status === "DISPATCHED",
    }));

    const fit = firstFit.current && payload.length > 0;
    if (fit) firstFit.current = false;

    webviewRef.current.injectJavaScript(
      `window.setIncidents(${JSON.stringify(JSON.stringify(payload))}, ${fit}); true;`
    );
  }, [active, mapReady]);

  useEffect(() => {
    if (!mapReady || !webviewRef.current || !station) return;
    webviewRef.current.injectJavaScript(
      `window.moveStation(${station.lat}, ${station.lng}); true;`
    );
  }, [station?.lat, station?.lng, mapReady]);

  const select = (id: string, scrollCard = true) => {
    setSelectedId(id);
    webviewRef.current?.injectJavaScript(
      `window.focusIncident(${JSON.stringify(id)}); true;`
    );

    if (scrollCard) {
      const index = active.findIndex((i) => i._id === id);
      if (index >= 0) {
        cardsRef.current?.scrollTo({
          x: index * (CARD_WIDTH + CARD_GAP),
          animated: true,
        });
      }
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") setMapReady(true);
      if (data.type === "markerPress") select(data.id);
    } catch {
      // ignore malformed messages
    }
  };

  // ----------------------------------------------------------
  // Actions
  // ----------------------------------------------------------
  const act = async (id: string, action: "accept" | "resolve") => {
    try {
      setActingOn(id);
      const res = await fetch(`${BASE_URL}/api/agency/incidents/${id}/${action}`, {
        method: "POST",
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        Alert.alert(
          action === "accept" ? "Couldn't accept" : "Couldn't resolve",
          body.message || "Please try again."
        );
      }

      await fetchIncidents();
    } catch (err: any) {
      Alert.alert("Network problem", err?.message || "Please try again.");
    } finally {
      setActingOn(null);
    }
  };

  const navigateTo = (inc: Incident) =>
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${inc.location.lat},${inc.location.lng}`
    );

  const callReporter = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const mapHtml = useMemo(() => {
    if (!station) return null;
    return buildMapHtml(station.lat, station.lng, theme.emoji, theme.color, theme.label);
    // Built once per initial station position (moves are pushed via JS).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station === null]);

  // ----------------------------------------------------------
  // States
  // ----------------------------------------------------------
  if (!GEOAPIFY_API_KEY) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="map-outline" size={56} color="#9CA3AF" />
        <Text style={styles.title}>Map key missing</Text>
        <Text style={styles.subtitle}>
          Add EXPO_PUBLIC_GEOAPIFY_API_KEY to the app's .env and rebuild.
        </Text>
      </SafeAreaView>
    );
  }

  if (!station || !mapHtml) {
    return (
      <SafeAreaView style={styles.centered}>
        {locError ? (
          <>
            <Ionicons name="location-outline" size={56} color={theme.color} />
            <Text style={styles.title}>Location needed</Text>
            <Text style={styles.subtitle}>{locError}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.color }]}
              onPress={() => {
                setLocError(null);
                syncLocation();
              }}
            >
              <Text style={styles.retryText}>Allow location</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={theme.color} />
            <Text style={[styles.subtitle, { marginTop: 12 }]}>
              Getting your station location…
            </Text>
          </>
        )}
      </SafeAreaView>
    );
  }

  const isPharmacy = role === "pharmacy";

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: mapHtml }}
        style={StyleSheet.absoluteFill}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
      />

      {/* Status banner */}
      <SafeAreaView edges={["top"]} style={styles.bannerWrap} pointerEvents="box-none">
        <View style={styles.banner}>
          <View
            style={[
              styles.bannerDot,
              { backgroundColor: active.length ? "#DC2626" : "#16A34A" },
            ]}
          />
          <Text style={styles.bannerText}>
            {loading
              ? "Checking for emergencies…"
              : isPharmacy
              ? "Pharmacy accounts don't receive SOS alerts"
              : active.length
              ? `${active.length} active emergenc${active.length === 1 ? "y" : "ies"} near you`
              : "No active emergencies near you"}
          </Text>
          {loading && <ActivityIndicator size="small" color="#111827" />}
        </View>

        {loadError && !loading ? (
          <TouchableOpacity style={styles.errorPill} onPress={fetchIncidents} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color="#991B1B" />
            <Text style={styles.errorText}>{loadError} — tap to retry</Text>
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>

      {/* Recenter on my station */}
      <TouchableOpacity
        style={styles.recenter}
        onPress={() =>
          webviewRef.current?.injectJavaScript(
            `window.recenter(${station.lat}, ${station.lng}); true;`
          )
        }
        activeOpacity={0.85}
        accessibilityLabel="Center on my station"
      >
        <Ionicons name="locate" size={26} color={theme.color} />
      </TouchableOpacity>

      {/* Incident cards */}
      {active.length > 0 && (
        <ScrollView
          ref={cardsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_GAP}
          decelerationRate="fast"
          style={styles.cards}
          contentContainerStyle={styles.cardsContent}
        >
          {active.map((inc) => {
            const away = distanceKm(
              station.lat,
              station.lng,
              inc.location.lat,
              inc.location.lng
            );
            const statusColor = STATUS_COLORS[inc.status] || "#DC2626";
            const selected = inc._id === selectedId;

            return (
              <AnimatedIncidentCard key={inc._id} index={active.indexOf(inc)}>
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => select(inc._id, false)}
                style={[
                  styles.card,
                  selected && { borderColor: statusColor, borderWidth: 2 },
                ]}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardEmoji}>
                    {EMERGENCY_EMOJI[inc.emergencyType] || "🆘"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {EMERGENCY_LABEL[inc.emergencyType] || inc.emergencyType}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {away.toFixed(1)} km away · {timeAgo(inc.createdAt)}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusText}>{inc.status}</Text>
                  </View>
                </View>

                <Text style={styles.reporter} numberOfLines={1}>
                  {inc.user?.name || "Unknown reporter"}
                  {inc.user?.phone ? `  ·  ${inc.user.phone}` : ""}
                </Text>

                {inc.message ? (
                  <Text style={styles.message} numberOfLines={2}>
                    “{inc.message}”
                  </Text>
                ) : null}

                {inc.respondingOfficer?.name ? (
                  <Text style={styles.responder} numberOfLines={1}>
                    Responding: {inc.respondingOfficer.name}
                  </Text>
                ) : null}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.color }]}
                    onPress={() => navigateTo(inc)}
                  >
                    <Ionicons name="navigate" size={17} color="#fff" />
                    <Text style={styles.actionText}>Navigate</Text>
                  </TouchableOpacity>

                  {!!inc.user?.phone && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionOutline]}
                      onPress={() => callReporter(inc.user?.phone)}
                    >
                      <Ionicons name="call" size={17} color="#111827" />
                      <Text style={[styles.actionText, { color: "#111827" }]}>Call</Text>
                    </TouchableOpacity>
                  )}

                  {role === "police" && inc.status === "DISPATCHED" && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#16A34A" }]}
                      onPress={() => act(inc._id, "accept")}
                      disabled={actingOn === inc._id}
                    >
                      <Text style={styles.actionText}>
                        {actingOn === inc._id ? "…" : "Accept"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {inc.status === "ACCEPTED" && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#111827" }]}
                      onPress={() => act(inc._id, "resolve")}
                      disabled={actingOn === inc._id}
                    >
                      <Text style={styles.actionText}>
                        {actingOn === inc._id ? "…" : "Resolve"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
              </AnimatedIncidentCard>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  centered: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginTop: 14, marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center", lineHeight: 21 },
  retryButton: { marginTop: 18, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  bannerWrap: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 14, paddingTop: 8 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  bannerDot: { width: 12, height: 12, borderRadius: 6 },
  bannerText: { flex: 1, fontSize: 15, fontWeight: "800", color: "#111827" },
  errorPill: {
    marginTop: 8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  errorText: { color: "#991B1B", fontSize: 13, fontWeight: "600", flexShrink: 1 },

  recenter: {
    position: "absolute",
    right: 16,
    top: 130,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 6,
  },

  cards: { position: "absolute", left: 0, right: 0, bottom: 14 },
  cardsContent: { paddingHorizontal: 14, gap: CARD_GAP },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  cardEmoji: { fontSize: 30 },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  cardMeta: { fontSize: 12.5, color: "#6B7280", marginTop: 1 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: "#fff", fontSize: 10.5, fontWeight: "800", letterSpacing: 0.4 },
  reporter: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  message: { fontSize: 13, color: "#4B5563", fontStyle: "italic", marginTop: 4 },
  responder: { fontSize: 12.5, color: "#2563EB", fontWeight: "700", marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionOutline: { backgroundColor: "#F3F4F6" },
  actionText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13.5 },
});

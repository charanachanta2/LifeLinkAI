import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { BASE_URL, useAuth } from "@/context/AuthContext";

const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;


type PlaceType = "hospital" | "police" | "fire_station" | "pharmacy";

type Place = {
  placeId: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating?: number;
  openNow?: boolean;
  // Set for accounts registered on LifeLink (verified responders).
  registered?: boolean;
  phone?: string;
  email?: string;
  distanceKm?: number;
};

type SosService = "police" | "hospital" | "firestation";

const SOS_SERVICES: {
  key: SosService;
  label: string;
  hint: string;
  emoji: string;
  color: string;
}[] = [
  { key: "police", label: "Police", hint: "Crime, accident, threat", emoji: "🚓", color: "#2563EB" },
  { key: "hospital", label: "Ambulance / Hospital", hint: "Injury, medical emergency", emoji: "🏥", color: "#DC2626" },
  { key: "firestation", label: "Fire Brigade", hint: "Fire, rescue, gas leak", emoji: "🚒", color: "#EA580C" },
];

type SimpleRegion = { latitude: number; longitude: number };

const FILTERS: {
  type: PlaceType;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { type: "hospital", label: "Hospitals", emoji: "🏥", color: "#DC2626" },
  { type: "police", label: "Police", emoji: "🚓", color: "#2563EB" },
  { type: "fire_station", label: "Fire Dept", emoji: "🚒", color: "#EA580C" },
  { type: "pharmacy", label: "Pharmacy", emoji: "💊", color: "#059669" },
];

// Static HTML shell for the Leaflet map. Only built once per initial region;
// markers are pushed in afterwards via injectJavaScript so we don't reload
// the whole WebView every time the filter/places change.
function buildMapHtml(lat: number, lng: number) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .pin {
      width: 44px; height: 44px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 3px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.45);
      font-size: 23px; line-height: 1; position: relative;
    }
    .pin.registered { border-color: #FACC15; width: 50px; height: 50px; font-size: 26px; }
    .badge {
      position: absolute; right: -6px; top: -6px; width: 20px; height: 20px;
      border-radius: 50%; background: #16A34A; color: #fff; border: 2px solid #fff;
      font: 800 12px/16px sans-serif; text-align: center;
    }
    .pin-tag {
      position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      margin-top: 4px; background: #111827; color: #fff; font: 700 10px sans-serif;
      padding: 2px 6px; border-radius: 7px; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    }
    .me { width: 44px; height: 44px; border-radius: 50%; background: rgba(37,99,235,0.18);
      display: flex; align-items: center; justify-content: center; animation: meP 2s ease-out infinite; }
    .me-dot { width: 20px; height: 20px; border-radius: 50%; background: #2563EB;
      border: 3px solid #fff; box-shadow: 0 1px 5px rgba(0,0,0,0.5); }
    @keyframes meP { 0% { transform: scale(.8); } 70% { transform: scale(1.15); } 100% { transform: scale(.8); } }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 15);

    L.tileLayer('https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}', {
      attribution: '© OpenMapTiles © OpenStreetMap contributors © Geoapify',
      maxZoom: 20,
    }).addTo(map);

    const userIcon = L.divIcon({
      className: '',
      html: '<div class="me"><div class="me-dot"></div></div>',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    L.marker([${lat}, ${lng}], { icon: userIcon }).addTo(map);

    let placeMarkers = [];

    function clearPlaceMarkers() {
      placeMarkers.forEach((m) => map.removeLayer(m));
      placeMarkers = [];
    }

    // Called from React Native via injectJavaScript.
    // The single nearest place (list is distance-sorted by the backend)
    // gets a "<Label> near you" tag so it's obvious at a glance, e.g.
    // "Police near you" instead of a generic, misleading label.
    window.updateMarkers = function (placesJson, color, emoji, nearLabel) {
      clearPlaceMarkers();
      const places = JSON.parse(placesJson);

      places.forEach((place, idx) => {
        const reg = !!place.registered;
        const size = reg ? 50 : 44;
        const showTag = idx === 0;
        const tagHtml = showTag
          ? '<div class="pin-tag">' + nearLabel + ' near you</div>'
          : '';
        const icon = L.divIcon({
          className: '',
          html: '<div style="position:relative"><div class="pin' + (reg ? ' registered' : '') + '" style="background:' + color + '"><span>' + emoji + '</span>' + (reg ? '<div class="badge">✓</div>' : '') + '</div>' + tagHtml + '</div>',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const marker = L.marker([place.location.lat, place.location.lng], { icon, zIndexOffset: reg ? 400 : (showTag ? 300 : 0) }).addTo(map);
        marker.on('click', function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', place }));
        });
        placeMarkers.push(marker);
      });
    };

    window.recenter = function (lat, lng) {
      map.setView([lat, lng], map.getZoom());
    };

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
</body>
</html>
  `;
}

export default function MapActivity() {
  const { authHeaders } = useAuth();
  const webviewRef = useRef<WebView>(null);
  const [region, setRegion] = useState<SimpleRegion | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeType, setActiveType] = useState<PlaceType>("hospital");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosServices, setSosServices] = useState<SosService[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Entrance animation for the map, and a gentle continuous pulse on the
  // SOS button so it reads as "always live".
  const mapBoxAnim = useRef(new Animated.Value(0)).current;
  const sosPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(mapBoxAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mapBoxAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sosPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sosPulse]);

  // Get current location once on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg(
          "Location permission is required to show nearby emergency places.",
        );
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

  const fetchPlaces = useCallback(
    async (type: PlaceType, lat: number, lng: number) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(
          `${BASE_URL}/api/emergency/nearby?lat=${lat}&lng=${lng}&type=${type}&radius=5000`,
          { headers: authHeaders() },
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Failed to fetch nearby places");
        }

        const data: Place[] = await res.json();
        setPlaces(data);
      } catch (err: any) {
        setErrorMsg(
          err.message || "Something went wrong fetching nearby places.",
        );
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    },
    [authHeaders],
  );

  // Fetch whenever we have a region or the filter changes
  useEffect(() => {
    if (region) {
      fetchPlaces(activeType, region.latitude, region.longitude);
    }
  }, [region?.latitude, region?.longitude, activeType, fetchPlaces]);

  const activeFilter = FILTERS.find((f) => f.type === activeType)!;

  // Push markers into the WebView whenever places or the active filter color changes
  useEffect(() => {
    if (!mapReady || !webviewRef.current) return;
    const json = JSON.stringify(places)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'");
    webviewRef.current.injectJavaScript(
      `window.updateMarkers('${json}', '${activeFilter.color}', '${activeFilter.emoji}', '${activeFilter.label}'); true;`,
    );
  }, [places, activeFilter.color, activeFilter.emoji, mapReady]);

  const handleMarkerPress = async (place: Place) => {
    // Registered LifeLink responders already carry their contact details.
    if (place.registered) {
      const buttons: any[] = [];
      if (place.phone) {
        buttons.push({ text: "Call", onPress: () => Linking.openURL(`tel:${place.phone}`) });
      }
      if (place.email) {
        buttons.push({ text: "Email", onPress: () => Linking.openURL(`mailto:${place.email}`) });
      }
      buttons.push({ text: "Close", style: "cancel" });

      Alert.alert(
        `✅ ${place.name}`,
        `Registered on LifeLink${
          place.distanceKm != null ? ` · ${place.distanceKm} km away` : ""
        }${place.phone ? `\n${place.phone}` : ""}`,
        buttons,
      );
      return;
    }

    try {
      const res = await fetch(
        `${BASE_URL}/api/emergency/place/${place.placeId}`,
        {
          headers: authHeaders(),
        },
      );
      const details = await res.json();
      const phone = details.formatted_phone_number;

      Alert.alert(
        place.name,
        `${place.address}${phone ? `\n${phone}` : ""}`,
        phone
          ? [
              { text: "Call", onPress: () => Linking.openURL(`tel:${phone}`) },
              { text: "Close", style: "cancel" },
            ]
          : [{ text: "Close", style: "cancel" }],
      );
    } catch {
      Alert.alert(place.name, place.address);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") {
        setMapReady(true);
      } else if (data.type === "markerPress") {
        handleMarkerPress(data.place);
      }
    } catch {
      // ignore malformed messages
    }
  };

  const openSosPicker = () => {
    if (!region) return;
    setSosServices([]);
    setSosOpen(true);
  };

  const toggleService = (key: SosService) =>
    setSosServices((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );

  const allSelected = sosServices.length === SOS_SERVICES.length;

  const sendSOS = async () => {
    if (!region || !sosServices.length) return;

    setSosLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/emergency/alert`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          lat: region.latitude,
          lng: region.longitude,
          services: sosServices,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to send alert");

      setSosOpen(false);

      // Tell the person exactly who was reached, and who could not be.
      const counts = body.agenciesNotified || {};
      const reached: string[] = [];
      const missing: string[] = [];

      SOS_SERVICES.filter((svc) => sosServices.includes(svc.key)).forEach((svc) => {
        const n = counts[svc.key] || 0;
        if (n > 0) reached.push(`${svc.label} (${n} nearby)`);
        else missing.push(svc.label);
      });

      let text = "Your emergency contacts have been notified.";
      if (reached.length) text += `\n\nAlerted: ${reached.join(", ")}.`;
      if (missing.length) {
        text += `\n\nNo registered ${missing.join(", ")} nearby yet — please also call 112.`;
      }

      Alert.alert("Alert sent", text);
    } catch (err: any) {
      Alert.alert("Couldn't send alert", err.message || "Please try again.");
    } finally {
      setSosLoading(false);
    }
  };

  const mapHtml = useMemo(() => {
    if (!region) return null;
    return buildMapHtml(region.latitude, region.longitude);
  }, [region?.latitude, region?.longitude]);

  if (errorMsg && !region) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.title}>Location needed</Text>
        <Text style={styles.subtitle}>{errorMsg}</Text>
      </View>
    );
  }

  if (!region || !mapHtml) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={[styles.subtitle, { marginTop: 12 }]}>
          Getting your location…
        </Text>
      </View>
    );
  }

  if (!GEOAPIFY_API_KEY) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emoji}>🗺️</Text>
        <Text style={styles.title}>Map key missing</Text>
        <Text style={styles.subtitle}>
          Add EXPO_PUBLIC_GEOAPIFY_API_KEY to your .env file and rebuild the
          app.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Plain full-screen map for civilian accounts — no box card, no
          list panel. Filter chips float on top; tap a marker for details. */}
      <Animated.View
        style={[
          styles.mapBox,
          {
            opacity: mapBoxAnim,
            transform: [
              {
                scale: mapBoxAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
              },
            ],
          },
        ]}
      >
        <WebView
          ref={webviewRef}
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          style={styles.map}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
        />

        {/* Loading / error feedback, top of the map box */}
        {loading && (
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color="#111827" />
            <Text style={styles.loadingText}>
              Finding {activeFilter.label.toLowerCase()}…
            </Text>
          </View>
        )}

        {errorMsg && !loading && (
          <View style={styles.errorPill}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Recenter-ish filter dock, docked to the bottom edge of the map box */}
        <View style={styles.filterDock}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((filter) => {
              const active = filter.type === activeType;
              return (
                <TouchableOpacity
                  key={filter.type}
                  onPress={() => setActiveType(filter.type)}
                  activeOpacity={0.85}
                  style={[
                  styles.filterChip,
                  active && {
                    backgroundColor: filter.color,
                    borderColor: filter.color,
                  },
                ]}
              >
                <View
                  style={[
                    styles.filterIconWrap,
                    active
                      ? styles.filterIconWrapActive
                      : { backgroundColor: `${filter.color}1A` },
                  ]}
                >
                  <Text style={styles.filterEmoji}>{filter.emoji}</Text>
                </View>
                <Text
                  style={[
                    styles.filterLabel,
                    active && styles.filterLabelActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          </ScrollView>
        </View>
      </Animated.View>

      {/* SOS button, floating above everything */}
      <Animated.View
        style={[styles.sosButtonWrap, { transform: [{ scale: sosPulse }] }]}
      >
        <TouchableOpacity
          style={styles.sosButton}
          onPress={openSosPicker}
          disabled={sosLoading}
          activeOpacity={0.8}
        >
          {sosLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.sosText}>SOS</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Which services do you need? */}
      <Modal
        visible={sosOpen}
        transparent
        animationType="slide"
        onRequestClose={() => !sosLoading && setSosOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Who do you need?</Text>
            <Text style={styles.sheetSubtitle}>
              Choose the services to alert. Your emergency contacts are always
              notified too.
            </Text>

            {SOS_SERVICES.map((svc) => {
              const on = sosServices.includes(svc.key);
              return (
                <TouchableOpacity
                  key={svc.key}
                  activeOpacity={0.85}
                  onPress={() => toggleService(svc.key)}
                  style={[
                    styles.serviceRow,
                    on && { borderColor: svc.color, backgroundColor: `${svc.color}12` },
                  ]}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: `${svc.color}22` }]}>
                    <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceLabel}>{svc.label}</Text>
                    <Text style={styles.serviceHint}>{svc.hint}</Text>
                  </View>
                  <View
                    style={[
                      styles.check,
                      on && { backgroundColor: svc.color, borderColor: svc.color },
                    ]}
                  >
                    {on && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() =>
                setSosServices(allSelected ? [] : SOS_SERVICES.map((svc) => svc.key))
              }
              style={styles.allButton}
            >
              <Text style={styles.allButtonText}>
                {allSelected ? "Clear selection" : "Select all services"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!sosServices.length || sosLoading) && styles.sendButtonDisabled,
              ]}
              onPress={sendSOS}
              disabled={!sosServices.length || sosLoading}
              activeOpacity={0.85}
            >
              {sosLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>
                  {sosServices.length ? "Send SOS Alert" : "Choose at least one service"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSosOpen(false)}
              disabled={sosLoading}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6F8" },
  centered: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center" },

  // Full-bleed map filling the whole tab — no rounded "box" card, no
  // details panel below it. Just the map.
  mapBox: {
    flex: 1,
    backgroundColor: "#E5E7EB",
  },
  map: { flex: 1, width: "100%", height: "100%" },

  // Filter dock - a floating rounded "shelf" docked to the bottom edge of
  // the map box itself.
  filterDock: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 11,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  filterRow: {
    paddingHorizontal: 10,
    gap: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    paddingRight: 16,
    borderRadius: 999,
  },
  filterIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  filterIconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  filterEmoji: { fontSize: 20 },
  filterLabel: { fontSize: 14, fontWeight: "700", color: "#374151" },
  filterLabelActive: { color: "#FFFFFF" },

  loadingPill: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: { marginLeft: 8, fontSize: 13, color: "#374151" },

  errorPill: {
    position: "absolute",
    top: 12,
    left: 24,
    right: 24,
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  errorText: { color: "#991B1B", fontSize: 13, textAlign: "center" },

  // Floats clearly above the filter dock (which sits at bottom:12 and is
  // roughly 70px tall) so the two never visually merge into one blob.
  sosButtonWrap: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  sosButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  sosText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // SOS service picker
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: 30,
  },
  sheetTitle: { fontSize: 22, fontWeight: "900", color: "#111827" },
  sheetSubtitle: { fontSize: 14, color: "#6B7280", lineHeight: 20, marginTop: 4, marginBottom: 16 },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  serviceIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  serviceEmoji: { fontSize: 28 },
  serviceLabel: { fontSize: 16, fontWeight: "800", color: "#111827" },
  serviceHint: { fontSize: 12.5, color: "#6B7280", marginTop: 2 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  allButton: { alignSelf: "center", paddingVertical: 8, marginBottom: 6 },
  allButtonText: { color: "#2563EB", fontWeight: "800", fontSize: 14.5 },
  sendButton: {
    backgroundColor: "#DC2626",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: "#FCA5A5" },
  sendButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16.5 },
  cancelButton: { alignItems: "center", paddingVertical: 14 },
  cancelText: { color: "#6B7280", fontWeight: "700", fontSize: 15 },
});
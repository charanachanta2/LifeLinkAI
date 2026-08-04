import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
};

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
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker([${lat}, ${lng}], { icon: userIcon }).addTo(map);

    let placeMarkers = [];

    function clearPlaceMarkers() {
      placeMarkers.forEach((m) => map.removeLayer(m));
      placeMarkers = [];
    }

    // Called from React Native via injectJavaScript
    window.updateMarkers = function (placesJson, color) {
      clearPlaceMarkers();
      const places = JSON.parse(placesJson);
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:' + color + ';transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      places.forEach((place) => {
        const marker = L.marker([place.location.lat, place.location.lng], { icon }).addTo(map);
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      `window.updateMarkers('${json}', '${activeFilter.color}'); true;`,
    );
  }, [places, activeFilter.color, mapReady]);

  const handleMarkerPress = async (place: Place) => {
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

  const handleSOS = () => {
    if (!region) return;

    Alert.alert(
      "Send SOS Alert?",
      "This will notify your emergency contacts with your current location.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Alert",
          style: "destructive",
          onPress: async () => {
            setSosLoading(true);
            try {
              const res = await fetch(`${BASE_URL}/api/emergency/alert`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                  lat: region.latitude,
                  lng: region.longitude,
                }),
              });

              const body = await res.json().catch(() => ({}));
              if (!res.ok)
                throw new Error(body.message || "Failed to send alert");

              Alert.alert(
                "Alert sent",
                "Your emergency contacts have been notified.",
              );
            } catch (err: any) {
              Alert.alert(
                "Couldn't send alert",
                err.message || "Please try again.",
              );
            } finally {
              setSosLoading(false);
            }
          },
        },
      ],
    );
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
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: mapHtml }}
        style={StyleSheet.absoluteFillObject}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
      />

      {/* Loading / error feedback sits just above the filter dock so it
          never collides with it */}
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

      {/* Filter dock: sits above the SOS button, just above the tab bar */}
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

      {/* SOS button */}
      <TouchableOpacity
        style={styles.sosButton}
        onPress={handleSOS}
        disabled={sosLoading}
        activeOpacity={0.8}
      >
        {sosLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.sosText}>SOS</Text>
        )}
      </TouchableOpacity>
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
    paddingHorizontal: 24,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center" },

  // Filter dock - a floating rounded "shelf" that sits low on the screen,
  // above the SOS button and right above the tab bar.
  filterDock: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 132,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 11,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  filterIconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  filterEmoji: { fontSize: 14 },
  filterLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  filterLabelActive: { color: "#FFFFFF" },

  loadingPill: {
    position: "absolute",
    bottom: 200,
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
    bottom: 200,
    left: 24,
    right: 24,
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  errorText: { color: "#991B1B", fontSize: 13, textAlign: "center" },

  sosButton: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    width: 78,
    height: 78,
    borderRadius: 39,
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
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
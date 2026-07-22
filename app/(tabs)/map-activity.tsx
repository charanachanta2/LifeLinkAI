import { useEffect, useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from "react-native";
import MapView, { Marker, Region, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";

import { useAuth, BASE_URL } from "@/context/AuthContext";

type PlaceType = "hospital" | "police" | "fire_station" | "pharmacy";

type Place = {
  placeId: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating?: number;
  openNow?: boolean;
};

const FILTERS: { type: PlaceType; label: string; emoji: string; color: string }[] = [
  { type: "hospital", label: "Hospitals", emoji: "🏥", color: "#DC2626" },
  { type: "police", label: "Police", emoji: "🚓", color: "#2563EB" },
  { type: "fire_station", label: "Fire Dept", emoji: "🚒", color: "#EA580C" },
  { type: "pharmacy", label: "Pharmacy", emoji: "💊", color: "#059669" },
];

export default function MapActivity() {
  const { authHeaders } = useAuth();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region | null>(null);
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
        setErrorMsg("Location permission is required to show nearby emergency places.");
        setLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const initialRegion: Region = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(initialRegion);
    })();
  }, []);

  const fetchPlaces = useCallback(
    async (type: PlaceType, lat: number, lng: number) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(
          `${BASE_URL}/api/emergency/nearby?lat=${lat}&lng=${lng}&type=${type}&radius=5000`,
          { headers: authHeaders() }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Failed to fetch nearby places");
        }

        const data: Place[] = await res.json();
        setPlaces(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Something went wrong fetching nearby places.");
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    },
    [authHeaders]
  );

  // Fetch whenever we have a region or the filter changes
  useEffect(() => {
    if (region) {
      fetchPlaces(activeType, region.latitude, region.longitude);
    }
  }, [region?.latitude, region?.longitude, activeType, fetchPlaces]);

  const activeFilter = FILTERS.find((f) => f.type === activeType)!;

  const handleMarkerPress = async (place: Place) => {
    try {
      const res = await fetch(`${BASE_URL}/api/emergency/place/${place.placeId}`, {
        headers: authHeaders(),
      });
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
          : [{ text: "Close", style: "cancel" }]
      );
    } catch {
      Alert.alert(place.name, place.address);
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
              if (!res.ok) throw new Error(body.message || "Failed to send alert");

              Alert.alert("Alert sent", "Your emergency contacts have been notified.");
            } catch (err: any) {
              Alert.alert("Couldn't send alert", err.message || "Please try again.");
            } finally {
              setSosLoading(false);
            }
          },
        },
      ]
    );
  };

  if (errorMsg && !region) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.title}>Location needed</Text>
        <Text style={styles.subtitle}>{errorMsg}</Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={[styles.subtitle, { marginTop: 12 }]}>Getting your location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
      >
        {places.map((place) => (
          <Marker
            key={place.placeId}
            coordinate={{
              latitude: place.location.lat,
              longitude: place.location.lng,
            }}
            pinColor={activeFilter.color}
            title={place.name}
            description={place.address}
            onPress={() => handleMarkerPress(place)}
          />
        ))}
      </MapView>

      {/* Filter tabs */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((filter) => {
            const active = filter.type === activeType;
            return (
              <TouchableOpacity
                key={filter.type}
                onPress={() => setActiveType(filter.type)}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: filter.color },
                ]}
              >
                <Text style={styles.filterEmoji}>{filter.emoji}</Text>
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Loading indicator for place fetches */}
      {loading && (
        <View style={styles.loadingPill}>
          <ActivityIndicator size="small" color="#111827" />
          <Text style={styles.loadingText}>Finding {activeFilter.label.toLowerCase()}…</Text>
        </View>
      )}

      {errorMsg && !loading && (
        <View style={styles.errorPill}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

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

  filterBar: {
    position: "absolute",
    top: 16,
    left: 0,
    right: 0,
  },
  filterRow: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  filterEmoji: { fontSize: 16, marginRight: 6 },
  filterLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  filterLabelActive: { color: "#FFFFFF" },

  loadingPill: {
    position: "absolute",
    bottom: 110,
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
    bottom: 110,
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
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  sosText: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", letterSpacing: 1 },
});
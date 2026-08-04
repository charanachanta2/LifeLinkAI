import CountdownCircle from "@/components/CountdownCircle";
import { resetEmergency } from "@/utils/EmergencyManager";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { BASE_URL, useAuth } from "@/context/AuthContext";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TOTAL_SECONDS = 15;

export default function EmergencyScreen() {
  const router = useRouter();
  const { authHeaders } = useAuth();
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const [status, setStatus] = useState(
    "Emergency alert will be sent automatically."
  );

  const [sent, setSent] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Error
    );

    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          sendEmergency();
          return 0;
        }

        Haptics.impactAsync(
          Haptics.ImpactFeedbackStyle.Heavy
        );

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (sent) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    return () => loop.stop();
  }, [sent]);

  const stopEmergency = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      if (incidentId) {
        await fetch(`${BASE_URL}/api/emergency/${incidentId}/safe`, {
          method: "POST",
          headers: authHeaders(),
        });
      }
    } catch {}

    resetEmergency();

    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );

    router.push("/(tabs)");
  };

  const sendEmergency = async () => {
    if (sent) return;

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error("Location permission denied");

      const position = await Location.getCurrentPositionAsync({});

      const res = await fetch(`${BASE_URL}/api/emergency/alert`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          emergencyType: "CRASH",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      });

      const body = await res.json();

      if (!res.ok) throw new Error(body.message || "Failed to send emergency");

      setIncidentId(body.incidentId);
      resetEmergency();
      setSent(true);
      setStatus("Emergency Alert Sent Successfully");

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.headerBlock}>
        <Animated.Text
          style={[
            styles.icon,
            !sent && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          🚨
        </Animated.Text>

        <Text style={styles.title}>POSSIBLE ACCIDENT</Text>
        <Text style={styles.subtitle}>DETECTED</Text>

        <Text style={styles.message}>{status}</Text>
      </View>

      {!sent && (
        <View style={styles.countdownWrap}>
          <CountdownCircle seconds={seconds} totalSeconds={TOTAL_SECONDS} />
        </View>
      )}

      {sent && (
        <View style={styles.sentBox}>
          <Text style={styles.sentTitle}>🚑 SOS SENT</Text>

          <View style={styles.sentList}>
            <Text style={styles.sentText}>✓ Live Location Shared</Text>
            <Text style={styles.sentText}>✓ Emergency Contacts Notified</Text>
            <Text style={styles.sentText}>✓ Nearby Hospital Alerted</Text>
            <Text style={styles.sentText}>✓ Medical Profile Shared</Text>
          </View>
        </View>
      )}

      {!sent && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>📍</Text>
            <Text style={styles.info}>Detecting Current Location...</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>👤</Text>
            <Text style={styles.info}>Emergency Contact Ready</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>🏥</Text>
            <Text style={styles.info}>Nearby Hospital Ready</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>📄</Text>
            <Text style={styles.info}>Medical Record Ready</Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        {!sent && (
          <>
            <TouchableOpacity
              style={styles.safeButton}
              activeOpacity={0.85}
              onPress={stopEmergency}
            >
              <Text style={styles.safeText}>I'M SAFE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sosButton}
              activeOpacity={0.85}
              onPress={sendEmergency}
            >
              <Text style={styles.sosText}>SEND SOS NOW</Text>
            </TouchableOpacity>
          </>
        )}

        {sent && (
          <TouchableOpacity
            style={styles.homeButton}
            activeOpacity={0.85}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.homeText}>RETURN TO HOME</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ==========================================================
  // ROOT
  // ==========================================================
  // NOTE: justifyContent: "flex-start" (instead of the previous
  // "space-between") plus explicit, tightened margins on each
  // section is what fixes the Android issue where "SEND SOS NOW"
  // was pushed off the bottom of the screen. "space-between"
  // silently overflows with no scrolling fallback whenever total
  // content height exceeds the available height on a given
  // device — Android phones with on-screen nav bars / shorter
  // aspect ratios have noticeably less usable height than most
  // iPhones, so the last button was clipped below the fold.
  // Everything below is also sized ~12-15% smaller so the whole
  // screen comfortably fits on compact devices on both platforms.

  container: {
    flex: 1,
    backgroundColor: "#A6001A",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
  },

  headerBlock: {
    alignItems: "center",
  },

  icon: {
    fontSize: 50,
    marginBottom: 2,
  },

  title: {
    fontSize: 23,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  subtitle: {
    fontSize: 14,
    color: "#FFD6D6",
    fontWeight: "800",
    letterSpacing: 3,
    marginTop: 2,
  },

  message: {
    color: "#FFECEC",
    textAlign: "center",
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 8,
    paddingHorizontal: 10,
  },

  countdownWrap: {
    marginTop: 10,
    marginBottom: 10,
  },

  infoCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    marginTop: 4,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  infoEmoji: {
    fontSize: 15,
    marginRight: 12,
    width: 28,
    height: 28,
    lineHeight: 28,
    textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    overflow: "hidden",
  },

  infoDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  info: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  actions: {
    width: "100%",
    marginTop: 14,
  },

  safeButton: {
    width: "100%",
    backgroundColor: "#25B26A",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },

  safeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16.5,
    letterSpacing: 0.5,
  },

  sosButton: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(166,0,26,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },

  sosText: {
    color: "#A6001A",
    fontWeight: "900",
    fontSize: 16.5,
    letterSpacing: 0.5,
  },

  sentBox: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginTop: 10,
  },

  sentTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 21,
    marginBottom: 14,
    textAlign: "center",
    letterSpacing: 0.5,
  },

  sentList: {
    marginTop: 2,
  },

  sentText: {
    color: "#fff",
    fontSize: 14.5,
    fontWeight: "600",
    marginVertical: 5,
  },

  homeButton: {
    width: "100%",
    backgroundColor: "#25B26A",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },

  homeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16.5,
    letterSpacing: 0.5,
  },
});
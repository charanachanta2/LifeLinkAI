import CountdownCircle from "@/components/CountdownCircle";
import { resetEmergency } from "@/utils/EmergencyManager";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const TOTAL_SECONDS = 15;

export default function EmergencyScreen() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const [status, setStatus] = useState(
    "Emergency alert will be sent automatically."
  );

  const [sent, setSent] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const stopEmergency = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    resetEmergency();

    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );

    router.push("/(tabs)");
  };

  const sendEmergency = async () => {
    if (sent) return;

    if (timerRef.current) clearInterval(timerRef.current);

    resetEmergency();

    setSent(true);

    setStatus("Emergency Alert Sent Successfully");

    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.icon}>🚨</Text>

      <Text style={styles.title}>
        POSSIBLE ACCIDENT
      </Text>

      <Text style={styles.subtitle}>
        DETECTED
      </Text>

      <Text style={styles.message}>
        {status}
      </Text>

      {!sent && (
        <View style={{ marginVertical: 30 }}>
          <CountdownCircle
            seconds={seconds}
            totalSeconds={TOTAL_SECONDS}
          />
        </View>
      )}

      {sent && (
        <View style={styles.sentBox}>
          <Text style={styles.sentTitle}>
            🚑 SOS SENT
          </Text>

          <Text style={styles.sentText}>
            ✓ Live Location Shared
          </Text>

          <Text style={styles.sentText}>
            ✓ Emergency Contacts Notified
          </Text>

          <Text style={styles.sentText}>
            ✓ Nearby Hospital Alerted
          </Text>

          <Text style={styles.sentText}>
            ✓ Medical Profile Shared
          </Text>
        </View>
      )}

      {!sent && (
        <View style={styles.infoCard}>
          <Text style={styles.info}>
            📍 Detecting Current Location...
          </Text>

          <Text style={styles.info}>
            👤 Emergency Contact Ready
          </Text>

          <Text style={styles.info}>
            🏥 Nearby Hospital Ready
          </Text>

          <Text style={styles.info}>
            📄 Medical Record Ready
          </Text>
        </View>
      )}

      {!sent && (
        <>
          <TouchableOpacity
            style={styles.safeButton}
            onPress={stopEmergency}
          >
            <Text style={styles.safeText}>
              I'M SAFE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sosButton}
            onPress={sendEmergency}
          >
            <Text style={styles.sosText}>
              SEND SOS NOW
            </Text>
          </TouchableOpacity>
        </>
      )}

      {sent && (
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push("/(tabs)")}
        >
          <Text style={styles.homeText}>
            RETURN TO HOME
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#B00020",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 24,
  },

  icon: {
    fontSize: 72,
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 3,
    marginTop: -15,
  },

  message: {
    color: "#FFECEC",
    textAlign: "center",
    fontSize: 17,
    lineHeight: 25,
  },

  infoCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 18,
  },

  info: {
    color: "#fff",
    fontSize: 17,
    marginVertical: 8,
    fontWeight: "600",
  },

  safeButton: {
    width: "100%",
    backgroundColor: "#2ECC71",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 15,
  },

  safeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
  },

  sosButton: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 15,
  },

  sosText: {
    color: "#B00020",
    fontWeight: "900",
    fontSize: 20,
  },

  sentBox: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 25,
    marginVertical: 20,
  },

  sentTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 26,
    marginBottom: 18,
    textAlign: "center",
  },

  sentText: {
    color: "#fff",
    fontSize: 18,
    marginVertical: 8,
  },

  homeButton: {
    width: "100%",
    backgroundColor: "#2ECC71",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },

  homeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
  },
});
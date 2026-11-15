import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Vibration, View } from "react-native";
import { Text } from "@/components/ll-text";
import {
  CrashCheckState,
  cancelPendingBackgroundSOS,
  getCrashCheckState,
  sendCrashAlertNow,
  subscribeCrashCheck,
} from "@/utils/CrashNotifications";

/**
 * Full-screen "Are you OK?" prompt shown when a crash is detected while the
 * app is open. Mirrors the notification: 10 s to answer, then the alert is sent.
 */
export default function CrashCheckOverlay() {
  const [state, setState] = useState<CrashCheckState>(getCrashCheckState());
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => subscribeCrashCheck(setState), []);

  useEffect(() => {
    if (state.phase !== "counting" || !state.deadline) return;
    const deadline = state.deadline;
    const update = () =>
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const t = setInterval(update, 250);
    return () => clearInterval(t);
  }, [state.phase, state.deadline]);

  useEffect(() => {
    if (state.phase === "counting") Vibration.vibrate([0, 500, 300, 500, 300, 500]);
    else Vibration.cancel();
    return () => Vibration.cancel();
  }, [state.phase]);

  const visible = state.phase !== "idle";
  const counting = state.phase === "counting";

  const title = counting
    ? "Are you OK?"
    : state.phase === "sending"
    ? "Sending alert…"
    : state.phase === "sent"
    ? state.test
      ? "Test complete"
      : "Alert sent"
    : "Couldn't send alert";

  const body = counting
    ? state.test
      ? "This is a test. Nothing will be sent."
      : "We detected a possible crash. If you don't answer, your emergency contacts will be alerted."
    : state.phase === "sending"
    ? "Contacting your emergency contacts…"
    : state.detail ?? "";

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.card, !counting && styles.cardCalm]}>
          <Text style={styles.title}>{title}</Text>

          {counting ? (
            <View style={styles.ring}>
              <Text style={styles.count}>{secondsLeft}</Text>
              <Text style={styles.countLabel}>seconds</Text>
            </View>
          ) : null}

          <Text style={styles.body}>{body}</Text>

          {counting ? (
            <>
              <Pressable
                style={({ pressed }) => [styles.okBtn, pressed && styles.pressed]}
                onPress={() => cancelPendingBackgroundSOS()}
                accessibilityRole="button"
                accessibilityLabel="I'm OK, cancel the alert"
              >
                <Text style={styles.okText}>I'm OK</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.sendBtn, pressed && styles.pressed]}
                onPress={() => sendCrashAlertNow("user")}
                accessibilityRole="button"
                accessibilityLabel="Send help now"
              >
                <Text style={styles.sendText}>Send help now</Text>
              </Pressable>
            </>
          ) : state.phase === "sent" || state.phase === "failed" ? (
            <Pressable
              style={({ pressed }) => [styles.okBtn, pressed && styles.pressed]}
              onPress={() => cancelPendingBackgroundSOS()}
            >
              <Text style={styles.okText}>Close</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#1A0B0B",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#DC2626",
    padding: 24,
    alignItems: "center",
  },
  cardCalm: { backgroundColor: "#0B120E", borderColor: "#2A3A30" },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", textAlign: "center" },
  ring: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 6,
    borderColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 22,
  },
  count: { fontSize: 64, fontWeight: "800", color: "#fff", lineHeight: 70 },
  countLabel: { fontSize: 13, color: "#F5A3A3", marginTop: -4 },
  body: {
    fontSize: 15,
    color: "#D4D4D4",
    textAlign: "center",
    lineHeight: 21,
    marginVertical: 14,
  },
  okBtn: {
    alignSelf: "stretch",
    backgroundColor: "#0F9D63",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  okText: { color: "#fff", fontSize: 19, fontWeight: "800" },
  sendBtn: {
    alignSelf: "stretch",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#DC2626",
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  sendText: { color: "#F87171", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.8 },
});

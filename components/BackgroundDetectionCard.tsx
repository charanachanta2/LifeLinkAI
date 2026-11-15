import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ll-text";
import { LL } from "@/constants/lifelink-theme";
import {
  SUPPORT_MESSAGES,
  backgroundDetectionSupport,
  disableBackgroundDetection,
  enableBackgroundDetection,
  getBackgroundPref,
  isBackgroundDetectionRunning,
} from "@/utils/BackgroundDetection";

/**
 * Settings card: turn always-on accident detection on/off and see its status.
 * Safe in Expo Go - the switch is disabled with an explanation.
 */
export default function BackgroundDetectionCard() {
  const support = backgroundDetectionSupport();
  const supported = support === "ok";

  const [enabled, setEnabled] = useState(false);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setEnabled(await getBackgroundPref());
    setRunning(isBackgroundDetectionRunning());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onToggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        const res = await enableBackgroundDetection();
        if (!res.ok) {
          Alert.alert("Can't turn on", res.message || "Something went wrong.");
        } else {
          Alert.alert(
            "Detection is on",
            "For reliable detection, set LifeLink's battery usage to “Unrestricted” in your phone settings.",
            [
              { text: "Later", style: "cancel" },
              { text: "Open settings", onPress: () => Linking.openSettings() },
            ]
          );
        }
      } else {
        await disableBackgroundDetection();
      }
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const status = !supported
    ? "Unavailable"
    : running
    ? "Active — monitoring in the background"
    : enabled
    ? "Starting…"
    : "Off";

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="car-sport-outline" size={22} color={LL.accent} />
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.title}>Background accident detection</Text>
          <Text style={styles.sub}>
            Keeps watching for crashes even when LifeLink is closed or your
            screen is off.
          </Text>
        </View>

        <Switch
          value={supported && enabled}
          onValueChange={onToggle}
          disabled={!supported || busy}
          trackColor={{ false: LL.border, true: LL.accentDisabled }}
          thumbColor={supported && enabled ? LL.accent : LL.textDim}
        />
      </View>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.dot,
            { backgroundColor: running ? LL.accent : LL.textDim },
          ]}
        />
        <Text style={styles.status}>Status: {status}</Text>
        <TouchableOpacity onPress={refresh} hitSlop={10}>
          <Ionicons name="refresh" size={16} color={LL.textMuted} />
        </TouchableOpacity>
      </View>

      {!supported ? (
        <Text style={styles.note}>
          {SUPPORT_MESSAGES[support as Exclude<typeof support, "ok">]}
        </Text>
      ) : (
        <Text style={styles.note}>
          If a crash is detected while the app is closed, you get an alert and
          15 seconds to cancel before an SOS is sent automatically.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: LL.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: LL.border,
  },
  row: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: LL.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textWrap: { flex: 1, marginRight: 10 },
  title: { fontSize: 15.5, fontWeight: "700", color: LL.text },
  sub: { fontSize: 12.5, color: LL.textMuted, marginTop: 3, lineHeight: 17 },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  status: { flex: 1, fontSize: 13, color: LL.textSoft },
  note: { fontSize: 12, color: LL.textMuted, marginTop: 10, lineHeight: 17 },
});

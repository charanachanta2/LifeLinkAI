import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ll-text";
import { LL } from "@/constants/lifelink-theme";
import {
  SUPPORT_MESSAGES,
  backgroundDetectionSupport,
  disableBackgroundDetection,
  enableBackgroundDetection,
  getBackgroundPref,
  isBackgroundDetectionRunning,
  openBatteryOptimizationSettings,
} from "@/utils/BackgroundDetection";
import { clearDetectionLog, getDetectionLog } from "@/utils/DebugLog";
import { triggerTestCheck } from "@/utils/EmergencyManager";

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
  const [showLog, setShowLog] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setEnabled(await getBackgroundPref());
    setRunning(isBackgroundDetectionRunning());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadLog = useCallback(async () => {
    setLogLines((await getDetectionLog()).slice().reverse());
  }, []);

  useEffect(() => {
    if (!showLog) return;
    loadLog();
    const t = setInterval(loadLog, 3000);
    return () => clearInterval(t);
  }, [showLog, loadLog]);

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
            "For reliable detection with the screen off, find LifeLink in the next screen and set it to “Not optimised” / “Unrestricted”.",
            [
              { text: "Later", style: "cancel" },
              { text: "Open battery settings", onPress: () => openBatteryOptimizationSettings() },
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

      <TouchableOpacity
        style={styles.logToggle}
        onPress={() => setShowLog((v) => !v)}
        activeOpacity={0.8}
      >
        <Ionicons name="terminal-outline" size={15} color={LL.textMuted} />
        <Text style={styles.logToggleText}>
          {showLog ? "Hide detection log" : "Show detection log"}
        </Text>
      </TouchableOpacity>

      {showLog ? (
        <View style={styles.logBox}>
          <ScrollView style={styles.logScroll} nestedScrollEnabled>
            {logLines.length === 0 ? (
              <Text style={styles.logLine}>No events yet.</Text>
            ) : (
              logLines.map((l, i) => (
                <Text key={i} style={styles.logLine}>
                  {l}
                </Text>
              ))
            )}
          </ScrollView>
          <TouchableOpacity
            onPress={async () => {
              await clearDetectionLog();
              setLogLines([]);
            }}
          >
            <Text style={styles.logClear}>Clear log</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!supported ? (
        <Text style={styles.note}>
          {SUPPORT_MESSAGES[support as Exclude<typeof support, "ok">]}
        </Text>
      ) : (
        <Text style={styles.note}>
          When a crash is detected (app open or closed) you get an “Are you
          OK?” notification. Tap “I'm OK” within 10 seconds, otherwise your
          emergency contacts are emailed automatically.
        </Text>
      )}

      <TouchableOpacity
        style={styles.testBtn}
        onPress={triggerTestCheck}
        activeOpacity={0.8}
      >
        <Ionicons name="notifications-outline" size={15} color={LL.accent} />
        <Text style={styles.testBtnText}>Test the safety check (sends nothing)</Text>
      </TouchableOpacity>
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
  logToggle: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  logToggleText: { marginLeft: 6, fontSize: 12.5, color: LL.textMuted },
  logBox: {
    marginTop: 8,
    backgroundColor: LL.elevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LL.border,
    padding: 10,
  },
  logScroll: { maxHeight: 220 },
  logLine: { fontSize: 11, color: LL.textSoft, marginBottom: 3, lineHeight: 15 },
  logClear: { fontSize: 12, color: LL.accent, marginTop: 8, fontWeight: "600" },
  testBtn: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  testBtnText: { marginLeft: 6, fontSize: 12.5, color: LL.accent, fontWeight: "600" },
  note: { fontSize: 12, color: LL.textMuted, marginTop: 10, lineHeight: 17 },
});

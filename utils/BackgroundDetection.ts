import Constants from "expo-constants";
import { Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { dlog } from "./DebugLog";
import {
  isBackgroundMonitorActive,
  isBackgroundMonitorSupported,
  startCrashMonitor,
  stopCrashMonitor,
} from "./BackgroundCrashMonitor";

const PREF_KEY = "lifelink_bg_detection_enabled";

export type BgSupport = "ok" | "expo-go" | "ios" | "no-native";

/** Can always-on detection run here? Explains why not, for the UI. */
export function backgroundDetectionSupport(): BgSupport {
  if (Platform.OS !== "android") return "ios";
  if (Constants.appOwnership === "expo") return "expo-go";
  return isBackgroundMonitorSupported() ? "ok" : "no-native";
}

export const SUPPORT_MESSAGES: Record<Exclude<BgSupport, "ok">, string> = {
  "expo-go":
    "Background detection needs the LifeLink app build. It isn't available in Expo Go.",
  ios: "Background accident detection is currently available on Android only.",
  "no-native":
    "This build doesn't include background detection. Install the latest LifeLink build.",
};

/**
 * Opens Android's "battery optimisation" list so the person can set LifeLink to
 * "Not optimised / Unrestricted". Without it many phones stop delivering sensor
 * data a few minutes after the screen turns off.
 */
export async function openBatteryOptimizationSettings() {
  try {
    await Linking.sendIntent("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS");
  } catch {
    try {
      await Linking.openSettings();
    } catch {}
  }
}

export async function getBackgroundPref(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREF_KEY)) === "1";
  } catch {
    return false;
  }
}

async function setBackgroundPref(on: boolean) {
  try {
    await AsyncStorage.setItem(PREF_KEY, on ? "1" : "0");
  } catch {}
}

export function isBackgroundDetectionRunning(): boolean {
  return isBackgroundMonitorActive();
}

/**
 * Asks for the permissions detection needs, then starts the service.
 * Must be called while the app is on screen (Android restriction).
 */
export async function enableBackgroundDetection(): Promise<{
  ok: boolean;
  message?: string;
}> {
  const support = backgroundDetectionSupport();
  if (support !== "ok") return { ok: false, message: SUPPORT_MESSAGES[support] };

  // 1. Location - needed to send your position with the SOS.
  const loc = await Location.requestForegroundPermissionsAsync();
  if (loc.status !== "granted") {
    return {
      ok: false,
      message:
        "Location permission is needed so emergency contacts get your position.",
    };
  }

  // 2. Notifications - needed for the crash alert and the service notice.
  try {
    const N = await import("expo-notifications");
    const current = await N.getPermissionsAsync();
    if (!current.granted) {
      const asked = await N.requestPermissionsAsync();
      if (!asked.granted) {
        return {
          ok: false,
          message:
            "Notification permission is needed to warn you before an alert is sent.",
        };
      }
    }
  } catch {
    return { ok: false, message: "Could not request notification permission." };
  }

  // 3. Start the foreground service.
  const started = await startCrashMonitor();
  if (!started) {
    return { ok: false, message: "Could not start background detection." };
  }

  await setBackgroundPref(true);
  dlog("✅ Background detection switched ON by the user");
  return { ok: true };
}

export async function disableBackgroundDetection() {
  await stopCrashMonitor();
  await setBackgroundPref(false);
  dlog("🛑 Background detection switched OFF by the user");
}

/** Call once the user is logged in: re-starts the service if it was on. */
export async function restoreBackgroundDetection() {
  if (backgroundDetectionSupport() !== "ok") return;
  if (!(await getBackgroundPref())) return;
  if (isBackgroundMonitorActive()) return;

  const loc = await Location.getForegroundPermissionsAsync();
  if (loc.status !== "granted") {
    dlog("⚠️ Background detection not restored: location permission missing");
    return;
  }
  const ok = await startCrashMonitor();
  dlog(ok ? "🔁 Background detection restored on app start" : "⚠️ Could not restore background detection");
}

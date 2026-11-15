import Constants from "expo-constants";
import { AppState, Platform } from "react-native";
import {
  registerCrashNotificationListener,
  tickPendingSOS,
} from "./CrashNotifications";
import {
  acquireSensors,
  getFusionStats,
  releaseSensors,
  resetFusionPeaks,
} from "./SensorFusion";
import { dlog } from "./DebugLog";

// react-native-background-actions is a native module: it exists only in a
// development / production build on Android — never in Expo Go. It is loaded
// lazily so Expo Go can import this file without any error.
let service: any = null;
function getService() {
  if (service) return service;
  if (Platform.OS !== "android" || Constants.appOwnership === "expo") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    service = require("react-native-background-actions").default;
  } catch {
    service = null;
  }
  return service;
}

/** True when the always-on background service can run on this device/build. */
export function isBackgroundMonitorSupported(): boolean {
  return !!getService();
}

export function isBackgroundMonitorActive(): boolean {
  try {
    return !!getService()?.isRunning();
  } catch {
    return false;
  }
}

const backgroundTask = async () => {
  // All sensors (accelerometer, gyroscope, barometer, GPS speed) are owned by
  // SensorFusion; this task keeps the foreground service alive and reports.
  await acquireSensors("background-service");
  // The "I'm OK" / "Send help now" buttons must work even if the app screen
  // was closed, so listen from here too (the listener is shared, never doubled).
  const unlisten = registerCrashNotificationListener();
  dlog("▶️ Background service started - background detection is ACTIVE");

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  let ticks = 0;

  try {
    while (getService()?.isRunning()) {
      ticks++;
      const s = getFusionStats();

      // Live proof it is running: the persistent notification shows what the
      // sensors read right now (updated every 2 s).
      if (ticks % 2 === 0) {
        try {
          const speed =
            s.speedMps != null ? ` · ${Math.round(s.speedMps * 3.6)} km/h` : "";
          await getService()?.updateNotification({
            taskDesc: `Active · motion ${s.mag.toFixed(2)} g · spin ${s.spin.toFixed(1)} rad/s${speed} · ${new Date().toLocaleTimeString("en-GB")}`,
          });
        } catch {}
      }

      if (ticks % 15 === 0) {
        dlog(
          `💓 alive (app ${AppState.currentState}) - ${s.readings} readings, last ${s.mag.toFixed(2)} g, peak ${s.peakMag.toFixed(2)} g, peak spin ${s.peakSpin.toFixed(1)} rad/s`
        );
        resetFusionPeaks();
      }

      // Backup for the 10 s countdown (sensor events also drive it).
      try {
        await tickPendingSOS();
      } catch (err) {
        console.warn("SOS tick failed:", err);
      }
      await sleep(1000);
    }
  } finally {
    unlisten();
    releaseSensors("background-service");
    dlog("⏹️ Background service stopped");
  }
};

const options = {
  taskName: "LifeLink Crash Monitor",
  taskTitle: "LifeLink is monitoring for crashes",
  taskDesc: "Accident detection is active in the background",
  taskIcon: { name: "ic_launcher", type: "mipmap" },
  color: "#DC2626",
  linkingURI: "lifelink://emergency",
  parameters: { delay: 1000 },
  // Must match android:foregroundServiceType in the manifest
  // (added by plugins/withBackgroundDetection.js).
  foregroundServiceType: ["location"],
};

/** Starts the background service. Returns false if it cannot run here. */
export async function startCrashMonitor(): Promise<boolean> {
  const svc = getService();
  if (!svc) return false;
  try {
    if (svc.isRunning()) return true;
    await svc.start(backgroundTask, options);
    return true;
  } catch (err) {
    dlog(`❌ Background crash monitor failed to start: ${(err as Error)?.message ?? err}`);
    return false;
  }
}

export async function stopCrashMonitor() {
  releaseSensors("background-service");
  try {
    await getService()?.stop();
  } catch {}
}

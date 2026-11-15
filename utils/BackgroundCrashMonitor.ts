import Constants from "expo-constants";
import { Platform } from "react-native";
import { Accelerometer } from "expo-sensors";
import { processSensorData } from "./AIEngine";

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

let subscription: ReturnType<typeof Accelerometer.addListener> | null = null;

const backgroundTask = async (taskDataArguments?: { delay: number }) => {
  const { delay } = taskDataArguments ?? { delay: 200 };

  Accelerometer.setUpdateInterval(delay);
  subscription?.remove();
  subscription = Accelerometer.addListener(({ x, y, z }) => {
    processSensorData(x, y, z);
  });

  // Keep the task alive until stopCrashMonitor() is called.
  await new Promise<void>(() => {});
};

const options = {
  taskName: "LifeLink Crash Monitor",
  taskTitle: "LifeLink is monitoring for crashes",
  taskDesc: "Accident detection is active in the background",
  taskIcon: { name: "ic_launcher", type: "mipmap" },
  color: "#DC2626",
  linkingURI: "lifelink://emergency",
  parameters: { delay: 200 },
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
    console.warn("Background crash monitor failed to start:", err);
    return false;
  }
}

export async function stopCrashMonitor() {
  subscription?.remove();
  subscription = null;
  try {
    await getService()?.stop();
  } catch {}
}

import { Accelerometer } from "expo-sensors";
import { processSensorData } from "./AIEngine";
import { isBackgroundMonitorActive } from "./BackgroundCrashMonitor";

let subscription: { remove: () => void } | null = null;
let started = false;

// Foreground detection (used while the app is open, and in Expo Go).
// When the background service is already running it owns the accelerometer,
// so this does nothing — two listeners would corrupt the shared detector state.
export function startSensors() {
  if (started) return;
  if (isBackgroundMonitorActive()) return;

  started = true;

  Accelerometer.setUpdateInterval(200);

  subscription = Accelerometer.addListener((data) => {
    processSensorData(data.x, data.y, data.z);
  });

  console.log("📱 Crash detection started");
}

export function stopSensors() {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }

  started = false;

  console.log("🛑 Crash detection stopped");
}

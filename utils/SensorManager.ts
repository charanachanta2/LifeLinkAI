import { Accelerometer } from "expo-sensors";
import { processSensorData } from "./AIEngine";

let subscription: { remove: () => void } | null = null;
let started = false;

export function startSensors() {
  if (started) return;

  started = true;

  Accelerometer.setUpdateInterval(200);

  subscription = Accelerometer.addListener((data) => {
    processSensorData(
      data.x,
      data.y,
      data.z
    );
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
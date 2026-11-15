import { detectCrash } from "./CrashDetection";
import { triggerEmergency } from "./EmergencyManager";

let processing = false;

export function processSensorData(
  x: number,
  y: number,
  z: number
) {
  if (processing) return;

  const crashDetected = detectCrash({
    accX: x,
    accY: y,
    accZ: z,
  });

  if (!crashDetected) return;

  processing = true;

  console.log("🚨 Possible crash detected");

  setTimeout(() => {
    triggerEmergency();
    processing = false;
  }, 1000);
}
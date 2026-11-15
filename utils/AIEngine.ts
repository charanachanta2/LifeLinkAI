import { AppState } from "react-native";
import {
  detectCrash,
  feedPressure,
  feedSpeed,
} from "./CrashDetection";
import { triggerEmergency } from "./EmergencyManager";
import { DetectionVia } from "./DetectionSource";
import { dlog } from "./DebugLog";

// Latest gyroscope reading (rad/s). The accelerometer and gyroscope report at
// the same rate, so each accelerometer sample is paired with the newest gyro one.
let gyro = { x: 0, y: 0, z: 0 };

export function processGyroData(x: number, y: number, z: number) {
  gyro = { x, y, z };
}

/** GPS speed in m/s. */
export function processSpeedData(mps: number | null | undefined) {
  feedSpeed(mps);
}

/** Barometer pressure in hPa. */
export function processPressureData(hPa: number | null | undefined) {
  feedPressure(hPa);
}

/**
 * `via` says which pipeline fed this sample, so the log can tell
 * "background detection" apart from "app was open".
 */
export function processSensorData(
  x: number,
  y: number,
  z: number,
  via: DetectionVia = "app-foreground"
) {
  const verdict = detectCrash({
    accX: x,
    accY: y,
    accZ: z,
    gyroX: gyro.x,
    gyroY: gyro.y,
    gyroZ: gyro.z,
  });

  if (!verdict) return;

  const appState = AppState.currentState ?? "unknown";
  dlog(
    `🚨 CRASH DETECTED · score ${verdict.score} · ${verdict.summary} · via ${via} · app ${appState}`
  );

  // Start the check right away. Nothing here waits on a timer: timers can be
  // held back while the app is in the background.
  triggerEmergency({
    via,
    appState,
    score: verdict.score,
    summary: verdict.summary,
  });
}

let previousMagnitude = 0;
let lastCrashTime = 0;

export interface SensorData {
  accX: number;
  accY: number;
  accZ: number;
}

const IMPACT_THRESHOLD = 1.8;
const COOLDOWN_MS = 5000;

export function detectCrash(sensor: SensorData): boolean {
  const magnitude = Math.sqrt(
    sensor.accX * sensor.accX +
      sensor.accY * sensor.accY +
      sensor.accZ * sensor.accZ
  );

  const impact = Math.abs(magnitude - previousMagnitude);

  previousMagnitude = magnitude;

  console.log(
    `Magnitude: ${magnitude.toFixed(2)} | Impact: ${impact.toFixed(2)}`
  );

  const now = Date.now();

  if (now - lastCrashTime < COOLDOWN_MS) {
    return false;
  }

  if (impact >= IMPACT_THRESHOLD) {
    console.log("🚨 TEST CRASH DETECTED");

    lastCrashTime = now;
    return true;
  }

  return false;
}
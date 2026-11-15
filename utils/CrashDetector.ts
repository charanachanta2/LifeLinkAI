let previousMagnitude = 0;
let lastCrashTime = 0;

export interface SensorData {
  accX: number;
  accY: number;
  accZ: number;
}

// ===============================
// Production Thresholds
// ===============================
const IMPACT_THRESHOLD = 5.5;
const STILLNESS_THRESHOLD = 0.35;
const STILLNESS_TIME = 2500;
const COOLDOWN = 10000;

let waitingForStillness = false;
let impactTime = 0;

export function detectCrash(sensor: SensorData): boolean {
  // Calculate total acceleration magnitude
  const magnitude = Math.sqrt(
    sensor.accX * sensor.accX +
      sensor.accY * sensor.accY +
      sensor.accZ * sensor.accZ
  );

  // Difference from previous reading
  const impact = Math.abs(magnitude - previousMagnitude);

  // ===============================
  // Debug Logs
  // ===============================
  console.log("📡 CrashDetector Running");
  console.log(
    `Magnitude: ${magnitude.toFixed(2)} | Impact: ${impact.toFixed(2)}`
  );

  previousMagnitude = magnitude;

  const now = Date.now();

  // Prevent repeated detections
  if (now - lastCrashTime < COOLDOWN) {
    return false;
  }

  // ===============================
  // Step 1: Detect strong impact
  // ===============================
  if (!waitingForStillness && impact >= IMPACT_THRESHOLD) {
    waitingForStillness = true;
    impactTime = now;

    console.log("⚠️ Strong impact detected...");
    return false;
  }

  // ===============================
  // Step 2: Confirm by stillness
  // ===============================
  if (waitingForStillness) {
    const nearGravity = Math.abs(magnitude - 1.0);

    console.log(
      `Waiting... Near Gravity = ${nearGravity.toFixed(2)}`
    );

    if (
      nearGravity < STILLNESS_THRESHOLD &&
      now - impactTime < STILLNESS_TIME
    ) {
      waitingForStillness = false;
      lastCrashTime = now;

      console.log("🚨 CRASH CONFIRMED");

      return true;
    }

    if (now - impactTime >= STILLNESS_TIME) {
      console.log("❌ False alarm - no stillness detected");
      waitingForStillness = false;
    }
  }

  return false;
}
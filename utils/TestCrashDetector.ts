export interface SensorData {
  accX: number;
  accY: number;
  accZ: number;
  /** rad/s from the gyroscope (optional: older callers send accelerometer only) */
  gyroX?: number;
  gyroY?: number;
  gyroZ?: number;
}

// A crash shows up as (a) a big swing in total acceleration within a fraction
// of a second, and often (b) the phone being spun / tumbled. We watch both
// over a short sliding window and combine them:
//
//   1. hard impact:        accel swing >= IMPACT_G
//   2. impact + rotation:  accel swing >= IMPACT_WITH_SPIN_G  AND  spin >= SPIN_RAD_S
//
// (2) catches rollovers / tumbles that are gentler on the accelerometer.
// Sensitivity preset. "high" reacts to a light shake or twist, so you can
// easily confirm detection is alive. Switch to "normal" for real-world use
// (it only reacts to genuine hard impacts and tumbles).
const SENSITIVITY: "high" | "normal" = "high";

const PRESETS = {
  high: { impactG: 0.8, impactWithSpinG: 0.3, spinRadS: 3 },
  normal: { impactG: 1.8, impactWithSpinG: 1.0, spinRadS: 5 },
} as const;

const IMPACT_G = PRESETS[SENSITIVITY].impactG; // g swing (max - min) inside the window
const IMPACT_WITH_SPIN_G = PRESETS[SENSITIVITY].impactWithSpinG;
const SPIN_RAD_S = PRESETS[SENSITIVITY].spinRadS; // rad/s
const WINDOW_MS = 500;
const COOLDOWN_MS = 5000;

type Sample = { t: number; m: number; g: number };
let samples: Sample[] = [];
let lastCrashTime = 0;

export function detectCrash(sensor: SensorData): boolean {
  const now = Date.now();
  const magnitude = Math.sqrt(
    sensor.accX * sensor.accX +
      sensor.accY * sensor.accY +
      sensor.accZ * sensor.accZ
  );
  const gx = sensor.gyroX ?? 0;
  const gy = sensor.gyroY ?? 0;
  const gz = sensor.gyroZ ?? 0;
  const spin = Math.sqrt(gx * gx + gy * gy + gz * gz);

  samples.push({ t: now, m: magnitude, g: spin });
  while (samples.length && now - samples[0].t > WINDOW_MS) samples.shift();

  if (now - lastCrashTime < COOLDOWN_MS) return false;

  let min = Infinity;
  let max = -Infinity;
  let maxSpin = 0;
  for (const s of samples) {
    if (s.m < min) min = s.m;
    if (s.m > max) max = s.m;
    if (s.g > maxSpin) maxSpin = s.g;
  }
  const swing = max - min;

  const hardImpact = swing >= IMPACT_G;
  const tumble = swing >= IMPACT_WITH_SPIN_G && maxSpin >= SPIN_RAD_S;

  if (hardImpact || tumble) {
    console.log(
      `🚨 CRASH PATTERN (${hardImpact ? "impact" : "impact+spin"}): swing ${swing.toFixed(2)} g, spin ${maxSpin.toFixed(1)} rad/s`
    );
    lastCrashTime = now;
    samples = [];
    return true;
  }

  return false;
}

// Multi-sensor crash detector.
//
// A single accelerometer spike is NOT enough: dropping the phone, a hard
// door slam or a pothole all look like "an impact". So the detector scores
// several independent signals and only fires when enough of them agree.
//
//   signal                         where it comes from              points
//   ------------------------------ -------------------------------- ------
//   hard impact  (>= 4 g)          accelerometer                    +2
//   severe impact (>= 8 g)         accelerometer                    +3
//   violent rotation (>= 6 rad/s)  gyroscope (rollover / spin)      +1
//   barometric jump (>= 0.4 hPa)   barometer (airbag / cabin shock) +1
//   was travelling (>= 18 km/h)    GPS speed                        +1
//   sudden stop (speed collapses)  GPS speed                        +3
//   phone motionless afterwards    accelerometer + gyroscope        +1
//   phone was stationary before    GPS speed ("just dropped it")    -2
//   vehicle kept moving after bump GPS speed (curb / pothole)       -2
//
// Fires at score >= 4. If the evidence is overwhelming right at the moment of
// impact (score >= 5) it fires immediately; otherwise it watches for 2 s to
// see what happens after the impact (did the vehicle stop? is the phone still?).
//
// Missing sensors are simply neutral (no GPS fix -> no speed points either way),
// so the detector keeps working on phones without a gyroscope or barometer.

export type CrashSample = {
  accX: number;
  accY: number;
  accZ: number;
  gyroX?: number;
  gyroY?: number;
  gyroZ?: number;
};

export type CrashVerdict = {
  score: number;
  summary: string;
  reasons: string[];
};

// --- tuning -----------------------------------------------------------------
const IMPACT_G = 4.0;
const SEVERE_IMPACT_G = 8.0;
const SPIN_RAD_S = 6.0;
const BARO_JUMP_HPA = 0.4;
const MOVING_MPS = 5; //  18 km/h
const STOP_FROM_MPS = 8; // was at least ~29 km/h ...
const STOP_TO_MPS = 3; //   ... and is now below ~11 km/h
const STATIONARY_MPS = 1.5;
const OBSERVE_MS = 2000;
const COOLDOWN_MS = 15000;
const FIRE_SCORE = 4;
const FIRE_NOW_SCORE = 5;
// -----------------------------------------------------------------------------

type Timed<T> = { t: number } & T;

let speedHist: Timed<{ v: number }>[] = [];
let pressHist: Timed<{ p: number }>[] = [];
let spinHist: Timed<{ s: number }>[] = [];
let lastFire = 0;

type Pending = {
  t0: number;
  peakG: number;
  peakSpin: number;
  speedBefore: number | null;
  still: number;
  total: number;
};
let pending: Pending | null = null;

const kmh = (mps: number) => Math.round(mps * 3.6);

function trim<T extends { t: number }>(arr: T[], now: number, keepMs: number) {
  let i = 0;
  while (i < arr.length && now - arr[i].t > keepMs) i++;
  return i ? arr.slice(i) : arr;
}

/** GPS speed in m/s (ignore negative / unknown values). */
export function feedSpeed(mps: number | null | undefined, now = Date.now()) {
  if (mps == null || !Number.isFinite(mps) || mps < 0) return;
  speedHist.push({ t: now, v: mps });
  speedHist = trim(speedHist, now, 40000);
}

/** Barometer pressure in hPa. */
export function feedPressure(hPa: number | null | undefined, now = Date.now()) {
  if (hPa == null || !Number.isFinite(hPa)) return;
  pressHist.push({ t: now, p: hPa });
  pressHist = trim(pressHist, now, 5000);
}

export function resetCrashDetector() {
  speedHist = [];
  pressHist = [];
  spinHist = [];
  pending = null;
  lastFire = 0;
}

function maxSpeedBetween(from: number, to: number): number | null {
  let best: number | null = null;
  for (const s of speedHist) {
    if (s.t >= from && s.t <= to && (best === null || s.v > best)) best = s.v;
  }
  return best;
}

/** Newest GPS speed, but only if that fix arrived at or after time `t`. */
function latestSpeedAfter(t: number): number | null {
  const last = speedHist[speedHist.length - 1];
  return last && last.t >= t ? last.v : null;
}

function baroRange(from: number, to: number): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of pressHist) {
    if (s.t < from || s.t > to) continue;
    if (s.p < lo) lo = s.p;
    if (s.p > hi) hi = s.p;
  }
  return hi > lo ? hi - lo : 0;
}

function evaluate(p: Pending, now: number, final: boolean): CrashVerdict {
  let score = 0;
  const reasons: string[] = [];

  if (p.peakG >= SEVERE_IMPACT_G) {
    score += 3;
    reasons.push(`severe impact ${p.peakG.toFixed(1)} g`);
  } else if (p.peakG >= IMPACT_G) {
    score += 2;
    reasons.push(`impact ${p.peakG.toFixed(1)} g`);
  }

  if (p.peakSpin >= SPIN_RAD_S) {
    score += 1;
    reasons.push(`spin ${p.peakSpin.toFixed(1)} rad/s`);
  }

  if (baroRange(p.t0 - 1500, now) >= BARO_JUMP_HPA) {
    score += 1;
    reasons.push("pressure jump");
  }

  if (p.speedBefore !== null && p.speedBefore >= MOVING_MPS) {
    score += 1;
    reasons.push(`was moving ${kmh(p.speedBefore)} km/h`);

    const after = latestSpeedAfter(p.t0);
    if (
      after !== null &&
      p.speedBefore >= STOP_FROM_MPS &&
      after <= STOP_TO_MPS
    ) {
      score += 3;
      reasons.push(`sudden stop ${kmh(p.speedBefore)} → ${kmh(after)} km/h`);
    }
  }

  // Phone sat still on a table / in a hand and then hit the floor.
  const recent = speedHist.filter((s) => s.t >= p.t0 - 20000 && s.t < p.t0);
  if (recent.length && recent.every((s) => s.v < STATIONARY_MPS)) {
    score -= 2;
    reasons.push("was stationary (could be a dropped phone)");
  }

  // The vehicle carried on at speed after the bump (curb, pothole, hard
  // braking...): that is not a crash, and a smooth road must not count as
  // "motionless". Needs a GPS fix at least 1 s after the impact.
  const vehicleKeptMoving =
    final &&
    p.speedBefore !== null &&
    p.speedBefore >= MOVING_MPS &&
    (latestSpeedAfter(p.t0 + 1000) ?? 0) >= MOVING_MPS;
  if (vehicleKeptMoving) {
    score -= 2;
    reasons.push("vehicle kept moving after the bump");
  }

  if (final && !vehicleKeptMoving && p.total >= 5 && p.still / p.total >= 0.6) {
    score += 1;
    reasons.push("phone motionless afterwards");
  }

  return { score, summary: reasons.join(", ") || "no evidence", reasons };
}

/**
 * Call for every accelerometer sample (in g). Returns a verdict when a crash
 * is detected, otherwise null.
 */
export function detectCrash(
  sample: CrashSample,
  now = Date.now()
): CrashVerdict | null {
  const { accX, accY, accZ } = sample;
  const mag = Math.sqrt(accX * accX + accY * accY + accZ * accZ);
  const spin = Math.sqrt(
    (sample.gyroX ?? 0) ** 2 +
      (sample.gyroY ?? 0) ** 2 +
      (sample.gyroZ ?? 0) ** 2
  );

  spinHist.push({ t: now, s: spin });
  spinHist = trim(spinHist, now, 1500);

  if (now - lastFire < COOLDOWN_MS) return null;

  if (!pending) {
    if (mag < IMPACT_G) return null;

    let peakSpin = 0;
    for (const s of spinHist) if (s.s > peakSpin) peakSpin = s.s;

    pending = {
      t0: now,
      peakG: mag,
      peakSpin,
      speedBefore: maxSpeedBetween(now - 10000, now),
      still: 0,
      total: 0,
    };

    const early = evaluate(pending, now, false);
    if (early.score >= FIRE_NOW_SCORE) {
      pending = null;
      lastFire = now;
      return early;
    }
    return null;
  }

  // Watching what happens after the impact.
  if (mag > pending.peakG) pending.peakG = mag;
  if (spin > pending.peakSpin) pending.peakSpin = spin;
  if (now - pending.t0 > 250) {
    pending.total++;
    if (Math.abs(mag - 1) < 0.15 && spin < 0.6) pending.still++;
  }

  const early = evaluate(pending, now, false);
  if (early.score >= FIRE_NOW_SCORE) {
    pending = null;
    lastFire = now;
    return early;
  }

  if (now - pending.t0 >= OBSERVE_MS) {
    const verdict = evaluate(pending, now, true);
    pending = null;
    if (verdict.score >= FIRE_SCORE) {
      lastFire = now;
      return verdict;
    }
  }
  return null;
}

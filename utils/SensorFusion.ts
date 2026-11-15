import { Accelerometer, Barometer, Gyroscope } from "expo-sensors";
import * as Location from "expo-location";
import { AppState } from "react-native";
import {
  processGyroData,
  processPressureData,
  processSensorData,
  processSpeedData,
} from "./AIEngine";
import { tickPendingSOS, updateKnownCoords } from "./CrashNotifications";
import { DetectionVia } from "./DetectionSource";
import { dlog } from "./DebugLog";

// ONE place that owns every sensor used for crash detection:
//   accelerometer (impact), gyroscope (rotation), barometer (pressure shock),
//   GPS (speed -> "was driving, then suddenly stopped").
//
// Two owners can ask for the sensors:
//   "background-service"  the foreground service (works with screen off / app closed)
//   "app-foreground"      the app being open (also works in Expo Go)
// The sensors run while either owner is active; the log says which one was
// in charge when a crash was detected.

type Owner = Extract<DetectionVia, "background-service" | "app-foreground">;

const ACC_MS = 20; // 50 Hz - impacts last only ~50-150 ms
const GYRO_MS = 20;
const BARO_MS = 100;
const WATCHDOG_MS = 5000;
const SILENT_RESTART_MS = 8000;

const owners = new Set<Owner>();
let starting: Promise<void> | null = null;
let running = false;

type Sub = { remove: () => void } | null;
let accSub: Sub = null;
let gyroSub: Sub = null;
let baroSub: Sub = null;
let gpsSub: Sub = null;
let watchdog: ReturnType<typeof setInterval> | null = null;

const stats = {
  readings: 0,
  mag: 0,
  spin: 0,
  peakMag: 0,
  peakSpin: 0,
  speedMps: null as number | null,
  lastReadingAt: 0,
  lastTickAt: 0,
  acc: false,
  gyro: false,
  baro: false,
  gps: false,
};

export const currentVia = (): Owner =>
  owners.has("background-service") ? "background-service" : "app-foreground";

export function getFusionStats() {
  return { ...stats, running, via: currentVia() };
}

export function resetFusionPeaks() {
  stats.peakMag = 0;
  stats.peakSpin = 0;
}

function removeAll() {
  for (const s of [accSub, gyroSub, baroSub, gpsSub]) {
    try {
      s?.remove();
    } catch {}
  }
  accSub = gyroSub = baroSub = gpsSub = null;
}

async function subscribe() {
  removeAll();
  stats.acc = stats.gyro = stats.baro = stats.gps = false;
  stats.lastReadingAt = Date.now();

  // --- accelerometer (required) ---------------------------------------------
  try {
    if (await Accelerometer.isAvailableAsync()) {
      Accelerometer.setUpdateInterval(ACC_MS);
      accSub = Accelerometer.addListener(({ x, y, z }) => {
        const now = Date.now();
        if (now - stats.lastReadingAt > 3000) {
          dlog(
            `⏸️ Sensors were silent for ${Math.round((now - stats.lastReadingAt) / 1000)}s (app ${AppState.currentState}) - phone was likely asleep`
          );
        }
        stats.lastReadingAt = now;
        stats.readings++;
        stats.mag = Math.sqrt(x * x + y * y + z * z);
        if (stats.mag > stats.peakMag) stats.peakMag = stats.mag;

        processSensorData(x, y, z, currentVia());

        // Sensor events keep arriving even if JS timers are held back, so use
        // them to also drive the "10 seconds are up" check.
        if (now - stats.lastTickAt > 250) {
          stats.lastTickAt = now;
          tickPendingSOS().catch(() => {});
        }
      });
      stats.acc = true;
    }
  } catch (err) {
    dlog(`❌ Accelerometer failed: ${(err as Error)?.message ?? err}`);
  }

  // --- gyroscope (optional) -------------------------------------------------
  try {
    if (await Gyroscope.isAvailableAsync()) {
      Gyroscope.setUpdateInterval(GYRO_MS);
      gyroSub = Gyroscope.addListener(({ x, y, z }) => {
        processGyroData(x, y, z);
        stats.spin = Math.sqrt(x * x + y * y + z * z);
        if (stats.spin > stats.peakSpin) stats.peakSpin = stats.spin;
      });
      stats.gyro = true;
    }
  } catch {}

  // --- barometer (optional: airbag / cabin pressure shock) ------------------
  try {
    if (await Barometer.isAvailableAsync()) {
      Barometer.setUpdateInterval(BARO_MS);
      baroSub = Barometer.addListener(({ pressure }) => {
        processPressureData(pressure);
      });
      stats.baro = true;
    }
  } catch {}

  // --- GPS speed (optional: needs location permission) ----------------------
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status === "granted") {
      gpsSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (loc) => {
          stats.speedMps =
            loc.coords.speed != null && loc.coords.speed >= 0
              ? loc.coords.speed
              : null;
          processSpeedData(loc.coords.speed);
          updateKnownCoords(loc.coords.latitude, loc.coords.longitude);
        }
      );
      stats.gps = true;
    }
  } catch (err) {
    dlog(`ℹ️ GPS speed unavailable: ${(err as Error)?.message ?? err}`);
  }

  const on = (b: boolean) => (b ? "✓" : "✗");
  dlog(
    `📡 Sensors (${currentVia()}): accelerometer ${on(stats.acc)} · gyroscope ${on(stats.gyro)} · barometer ${on(stats.baro)} · GPS speed ${on(stats.gps)}`
  );
}

async function start() {
  if (running) return;
  if (starting) return starting;
  starting = (async () => {
    await subscribe();
    running = true;
    // Android can silently drop a sensor registration (power saving, another
    // app grabbing the sensor...). If nothing arrives for a while, re-subscribe.
    if (watchdog) clearInterval(watchdog);
    watchdog = setInterval(() => {
      if (!running) return;
      if (Date.now() - stats.lastReadingAt > SILENT_RESTART_MS) {
        dlog("🔄 No sensor data for 8s - re-subscribing to sensors");
        subscribe().catch(() => {});
      }
    }, WATCHDOG_MS);
  })().finally(() => {
    starting = null;
  });
  return starting;
}

function stop() {
  if (watchdog) {
    clearInterval(watchdog);
    watchdog = null;
  }
  removeAll();
  processGyroData(0, 0, 0);
  running = false;
  dlog("🛑 Sensors stopped");
}

export async function acquireSensors(owner: Owner) {
  owners.add(owner);
  await start();
}

export function releaseSensors(owner: Owner) {
  owners.delete(owner);
  if (owners.size === 0 && (running || starting)) stop();
}

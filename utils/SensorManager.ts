import { acquireSensors, releaseSensors } from "./SensorFusion";
import { dlog } from "./DebugLog";

let started = false;

// Detection while the app is open (also the only mode in Expo Go).
// It shares the sensor layer with the background service: if the service is
// running it is the one reported as the detector, and this just stays ready
// to take over if the service is switched off.
export function startSensors() {
  if (started) return;
  started = true;
  acquireSensors("app-foreground").catch(() => {});
  dlog("📱 Crash detection started (app open)");
}

export function stopSensors() {
  if (!started) return;
  started = false;
  releaseSensors("app-foreground");
  dlog("🛑 Crash detection stopped (app open)");
}

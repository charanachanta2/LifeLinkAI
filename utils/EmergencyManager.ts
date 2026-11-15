import { AppState } from "react-native";
import { startCrashCheck } from "./CrashNotifications";
import { TriggerInfo, sourceDetail } from "./DetectionSource";
import { dlog } from "./DebugLog";

let emergencyTriggered = false;

/**
 * Kept so existing imports keep compiling. A detected crash no longer jumps
 * straight to the SOS screen: it starts the "Are you OK?" check instead
 * (notification + on-screen prompt, 10 s to answer), in every app state.
 */
export function registerEmergencyCallback(_callback: () => void) {}

export function triggerEmergency(info?: TriggerInfo) {
  if (emergencyTriggered) return;

  emergencyTriggered = true;
  const trigger: TriggerInfo = info ?? {
    via: "app-foreground",
    appState: AppState.currentState ?? "unknown",
  };
  dlog(`🚨 Starting safety check · source: ${sourceDetail(trigger)}`);

  // Detection re-arms once the check is over (answered, sent or failed).
  startCrashCheck(
    () => {
      emergencyTriggered = false;
    },
    { trigger }
  ).catch(() => {
    emergencyTriggered = false;
  });
}

/** Runs the whole safety check without sending anything (Settings "Test" button). */
export function triggerTestCheck() {
  if (emergencyTriggered) return;
  emergencyTriggered = true;
  startCrashCheck(
    () => {
      emergencyTriggered = false;
    },
    {
      test: true,
      trigger: {
        via: "manual-test",
        appState: AppState.currentState ?? "unknown",
      },
    }
  ).catch(() => {
    emergencyTriggered = false;
  });
}

export function resetEmergency() {
  emergencyTriggered = false;
}

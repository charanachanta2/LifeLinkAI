import { AppState } from "react-native";
import { handleCrashWhileInBackground } from "./CrashNotifications";

let emergencyTriggered = false;

let emergencyCallback: (() => void) | null = null;

export function registerEmergencyCallback(callback: () => void) {
  emergencyCallback = callback;
}

export function triggerEmergency() {
  if (emergencyTriggered) return;

  emergencyTriggered = true;

  // App is open and on screen -> show the emergency countdown screen.
  if (AppState.currentState === "active") {
    emergencyCallback?.();
    return;
  }

  // App is in the background -> notify the user and auto-send the SOS if
  // they don't respond. Detection re-arms once this flow finishes.
  handleCrashWhileInBackground(() => {
    emergencyTriggered = false;
  });
}

export function resetEmergency() {
  emergencyTriggered = false;
}

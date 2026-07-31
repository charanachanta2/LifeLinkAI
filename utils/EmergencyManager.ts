let emergencyTriggered = false;

let emergencyCallback: (() => void) | null = null;

export function registerEmergencyCallback(
  callback: () => void
) {
  emergencyCallback = callback;
}

export function triggerEmergency() {
  if (emergencyTriggered) return;

  emergencyTriggered = true;

  if (emergencyCallback) {
    emergencyCallback();
  }
}

export function resetEmergency() {
  emergencyTriggered = false;
}
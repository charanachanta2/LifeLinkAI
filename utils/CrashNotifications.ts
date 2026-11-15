import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { API_BASE_URL } from "@/config/api";

// What happens when a crash is detected while the app is NOT on screen:
//   1. a high-priority notification appears ("Possible crash detected")
//   2. a 15 s countdown starts
//   3. "I'm OK" cancels it; tapping the notification opens the emergency
//      screen (which takes over); otherwise the SOS is sent automatically.

const CHANNEL_ID = "crash-alerts";
const CATEGORY_ID = "crash-alert";
const ACTION_SAFE = "SAFE";
const SOS_DELAY_MS = 15000;

let sosTimer: ReturnType<typeof setTimeout> | null = null;
let alertNotificationId: string | null = null;
let onFinished: (() => void) | null = null;

const canNotify = () =>
  Platform.OS === "android" && Constants.appOwnership !== "expo";

// expo-notifications is imported lazily so Expo Go never loads it.
async function notifications() {
  return await import("expo-notifications");
}

async function ensureSetup() {
  const N = await notifications();
  await N.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Crash alerts",
    importance: N.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 300, 500, 300, 500],
    lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
  await N.setNotificationCategoryAsync(CATEGORY_ID, [
    {
      identifier: ACTION_SAFE,
      buttonTitle: "I'm OK — cancel",
      options: { opensAppToForeground: false },
    },
  ]);
}

async function post(title: string, body: string, withActions: boolean) {
  const N = await notifications();
  return N.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: "crash" },
      categoryIdentifier: withActions ? CATEGORY_ID : undefined,
      sticky: withActions,
      priority: N.AndroidNotificationPriority.MAX,
    },
    trigger: { channelId: CHANNEL_ID },
  });
}

function finish() {
  const cb = onFinished;
  onFinished = null;
  cb?.();
}

/** Stops a pending automatic SOS (user is safe, or the app took over). */
export async function cancelPendingBackgroundSOS() {
  const wasPending = !!sosTimer;
  if (sosTimer) clearTimeout(sosTimer);
  sosTimer = null;

  if (alertNotificationId && canNotify()) {
    try {
      const N = await notifications();
      await N.dismissNotificationAsync(alertNotificationId);
    } catch {}
  }
  alertNotificationId = null;
  if (wasPending) finish();
}

async function sendBackgroundSOS() {
  sosTimer = null;
  try {
    // Lazy: the Firebase config only matters once we actually send.
    const { firebaseAuth } = await import("@/config/firebase");
    const idToken = await firebaseAuth.currentUser?.getIdToken();
    if (!idToken) throw new Error("Not signed in");

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const res = await fetch(`${API_BASE_URL}/api/emergency/alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        emergencyType: "CRASH",
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }),
    });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);

    await post(
      "Emergency alert sent",
      "Your emergency contacts and nearby services were notified.",
      false
    ).catch(() => {});
  } catch (err) {
    console.warn("Background SOS failed:", err);
    await post(
      "Could not send emergency alert",
      "Open LifeLink and send the alert manually.",
      false
    ).catch(() => {});
  } finally {
    finish();
  }
}

export async function handleCrashWhileInBackground(done: () => void) {
  onFinished = done;
  if (!canNotify()) {
    finish();
    return;
  }
  try {
    await ensureSetup();
    alertNotificationId = await post(
      "🚨 Possible crash detected",
      "Sending an SOS in 15 seconds. Tap to open, or choose “I'm OK” to cancel.",
      true
    );
  } catch (err) {
    console.warn("Crash notification failed:", err);
  }
  if (sosTimer) clearTimeout(sosTimer);
  sosTimer = setTimeout(sendBackgroundSOS, SOS_DELAY_MS);
}

/**
 * Listens for taps on the crash notification.
 *  - "I'm OK" button -> cancel the automatic SOS
 *  - tapping the notification -> hand over to the emergency screen
 * Returns an unsubscribe function. No-op in Expo Go.
 */
export function registerCrashNotificationListener(openEmergency: () => void) {
  if (!canNotify()) return () => {};

  let sub: { remove: () => void } | null = null;
  let cancelled = false;

  notifications()
    .then((N) => {
      if (cancelled) return;
      const handle = (response: any) => {
        if (response?.notification?.request?.content?.data?.type !== "crash") return;
        if (response.actionIdentifier === ACTION_SAFE) {
          cancelPendingBackgroundSOS();
        } else {
          // The emergency screen has its own countdown; avoid a double send.
          cancelPendingBackgroundSOS();
          openEmergency();
        }
      };
      sub = N.addNotificationResponseReceivedListener(handle);
      N.getLastNotificationResponseAsync()
        .then((r) => r && handle(r))
        .catch(() => {});
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    sub?.remove();
  };
}

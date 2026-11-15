import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { API_BASE_URL } from "@/config/api";
import { dlog } from "./DebugLog";
import { TriggerInfo, sourceDetail, sourceTag, toApiSource } from "./DetectionSource";

// Safety check, used whether the app is open OR in the background:
//
//   1. crash detected -> a high-priority notification "Are you OK?" pops up
//      (and, when the app is on screen, a full-screen prompt too)
//   2. the person has 10 seconds: "I'm OK" cancels, "Send help now" sends
//   3. no answer -> the alert goes to their emergency contacts
//
// The phone also registers the check with the server right away
// (POST /api/emergency/crash-check). If the phone is destroyed or goes
// offline before the 10 s are up, the server sends the alert itself.

export const SAFETY_CHECK_SECONDS = 10;
const SOS_DELAY_MS = SAFETY_CHECK_SECONDS * 1000;

const CHANNEL_ID = "crash-alerts";
const CATEGORY_ID = "crash-alert";
const ACTION_SAFE = "SAFE";
const ACTION_SEND = "SEND";

// ---------------------------------------------------------------------------
// State (also read by the on-screen prompt, components/CrashCheckOverlay.tsx)
// ---------------------------------------------------------------------------

export type CrashCheckPhase = "idle" | "counting" | "sending" | "sent" | "failed";

export type CrashCheckState = {
  phase: CrashCheckPhase;
  /** epoch ms when the countdown ends (only while counting) */
  deadline: number | null;
  /** true for the "test the safety check" button: nothing is really sent */
  test: boolean;
  detail?: string;
};

let state: CrashCheckState = { phase: "idle", deadline: null, test: false };
const listeners = new Set<(s: CrashCheckState) => void>();

function setState(next: Partial<CrashCheckState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l(state));
}

export function getCrashCheckState() {
  return state;
}

export function subscribeCrashCheck(listener: (s: CrashCheckState) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Deadline is checked by tickPendingSOS(). It is driven by the background
// service (every second), by an in-app interval, and when the app comes to the
// foreground - plain setTimeout timers can stall in the background.
let sosDeadline: number | null = null;
let sosSending = false;
let isTest = false;
let alertNotificationId: string | null = null;
let onFinished: (() => void) | null = null;
let uiTicker: ReturnType<typeof setInterval> | null = null;
let resetTimer: ReturnType<typeof setTimeout> | null = null;

// Server-side record of this check (the fail-safe). Resolves to the incident
// id, or null if it could not be registered (offline, not signed in...).
let registration: Promise<string | null> = Promise.resolve(null);
let lastCoords: { lat: number; lng: number } | null = null;
let lastCoordsAt = 0;

// Who detected this crash (background service vs app open). Shown in every log line.
let trigger: TriggerInfo | null = null;
const tag = () => sourceTag(trigger);

/** Fed by the GPS watcher so a fresh position is on hand the moment a crash happens. */
export function updateKnownCoords(lat: number, lng: number) {
  lastCoords = { lat, lng };
  lastCoordsAt = Date.now();
}

/** Fields that tell the server how the crash was detected. */
function triggerPayload() {
  return {
    source: toApiSource(trigger),
    detectedVia: trigger?.via,
    appState: trigger?.appState,
    details: trigger?.summary,
  };
}

const canNotify = () =>
  Platform.OS === "android" && Constants.appOwnership !== "expo";

// expo-notifications is imported lazily so Expo Go never loads it.
async function notifications() {
  return await import("expo-notifications");
}

let handlerSet = false;
async function ensureSetup() {
  const N = await notifications();

  // Show notifications while the app is open too (otherwise Android hides them).
  if (!handlerSet) {
    handlerSet = true;
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }

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
      buttonTitle: "I'm OK",
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_SEND,
      buttonTitle: "Send help now",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}

async function post(
  title: string,
  body: string,
  withActions: boolean,
  data: Record<string, unknown> = {}
) {
  const N = await notifications();
  return N.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: "crash", ...data },
      categoryIdentifier: withActions ? CATEGORY_ID : undefined,
      sticky: withActions,
      priority: N.AndroidNotificationPriority.MAX,
    },
    trigger: { channelId: CHANNEL_ID },
  });
}

async function dismissAlertNotification() {
  if (alertNotificationId && canNotify()) {
    try {
      const N = await notifications();
      await N.dismissNotificationAsync(alertNotificationId);
    } catch {}
  }
  alertNotificationId = null;
}

/**
 * Pre-loads the notification setup (channel, buttons, handler) and the sign-in
 * code, so the "Are you OK?" alert shows instantly when a crash happens.
 * Called once after login by components/CrashDetectionBootstrap.tsx.
 * Never throws: anything that fails here is retried when it is really needed.
 */
export async function prepareCrashAlerts(): Promise<void> {
  const jobs: Promise<unknown>[] = [import("@/config/firebase").catch(() => {})];
  if (canNotify()) jobs.push(ensureSetup().catch(() => {}));
  await Promise.all(jobs);
}

// ---------------------------------------------------------------------------
// Server calls
// ---------------------------------------------------------------------------

async function authHeaders() {
  // Lazy: the Firebase config only matters once we actually talk to the server.
  const { firebaseAuth } = await import("@/config/firebase");
  const idToken = await firebaseAuth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Not signed in");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
}

async function api(path: string, body: unknown) {
  const res = await fetch(`${API_BASE_URL}/api/emergency${path}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Server responded ${res.status}`);
  return res.json();
}

async function getCoords(): Promise<{ lat: number; lng: number }> {
  // A fix from the last 20 s is good enough and avoids waiting on the GPS.
  if (lastCoords && Date.now() - lastCoordsAt < 20000) return lastCoords;
  try {
    const p = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 6000)),
    ]);
    if (p) {
      updateKnownCoords(p.coords.latitude, p.coords.longitude);
      return lastCoords!;
    }
  } catch {}
  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last) {
      updateKnownCoords(last.coords.latitude, last.coords.longitude);
      return lastCoords!;
    }
  } catch {}
  if (lastCoords) return lastCoords;
  throw new Error("No location available");
}

/** Tells the server a check started so it can send the alert if we go silent. */
async function registerWithServer(): Promise<string | null> {
  try {
    const { lat, lng } = await getCoords();
    const out = await api("/crash-check", { lat, lng, ...triggerPayload() });
    dlog(`🛰️ Safety check registered on server (${out.incidentId}) · source: ${tag()}`);
    return String(out.incidentId);
  } catch (err) {
    dlog(`⚠️ Could not register with server: ${(err as Error)?.message ?? err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

function finish() {
  if (uiTicker) {
    clearInterval(uiTicker);
    uiTicker = null;
  }
  const cb = onFinished;
  onFinished = null;
  cb?.();
}

function scheduleIdleReset(ms: number) {
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    resetTimer = null;
    if (!sosDeadline && !sosSending) {
      setState({ phase: "idle", deadline: null, test: false, detail: undefined });
    }
  }, ms);
}

/** "I'm OK": stops the countdown and cancels the server-side check. */
export async function cancelPendingBackgroundSOS() {
  const wasPending = sosDeadline !== null;
  sosDeadline = null;
  setState({ phase: "idle", deadline: null, test: false, detail: undefined });

  await dismissAlertNotification();

  if (wasPending) {
    dlog(`👍 User is OK - safety check cancelled · source: ${tag()}`);
    if (!isTest) {
      // The registration may still be in flight: cancel once we have the id.
      registration
        .then((id) => (id ? api(`/${id}/safe`, {}) : null))
        .then((r) => r && dlog("✅ Server told the person is safe"))
        .catch((err) =>
          dlog(`⚠️ Could not cancel on server: ${(err as Error)?.message ?? err}`)
        );
    }
    finish();
  }
}

/** Sends the alert right now (countdown ran out, or "Send help now"). */
export async function sendCrashAlertNow(reason: "timeout" | "user" = "user") {
  if (sosSending) return;
  if (sosDeadline === null) return;
  sosDeadline = null;
  sosSending = true;
  setState({ phase: "sending", deadline: null });
  await dismissAlertNotification();
  dlog(
    `🆘 Sending alert (${reason}) · source: ${sourceDetail(trigger)}${isTest ? " [test]" : ""}`
  );

  try {
    if (isTest) {
      await new Promise((r) => setTimeout(r, 800));
      setState({ phase: "sent", detail: "Test only - nobody was contacted." });
      if (canNotify()) {
        await post(
          "Test complete",
          "This was only a test. In a real crash your emergency contacts would be emailed.",
          false
        ).catch(() => {});
      }
      return;
    }

    let coords: { lat: number; lng: number } | null = null;
    try {
      coords = await getCoords();
    } catch {}

    const incidentId = await registration;
    let out: any;

    if (incidentId) {
      out = await api(`/${incidentId}/confirm`, {
        reason,
        ...triggerPayload(),
        ...(coords ?? {}),
      });
    } else {
      if (!coords) throw new Error("No location available");
      // Could not register earlier (was offline?) - send it as a normal alert.
      out = await api("/alert", {
        emergencyType: "CRASH",
        ...triggerPayload(),
        ...coords,
      });
    }

    const n = out?.contactsNotified;
    const detail =
      typeof n === "number" && n > 0
        ? `${n} emergency contact${n === 1 ? "" : "s"} emailed.`
        : "Your emergency contacts and nearby services were notified.";
    dlog(
      `✅ SOS sent to server · source: ${tag()} · ${
        typeof n === "number" ? `${n} contact(s) emailed` : "contacts notified"
      }`
    );
    setState({ phase: "sent", detail });

    if (canNotify()) {
      await post("Emergency alert sent", detail, false).catch(() => {});
    }
  } catch (err) {
    dlog(`❌ SOS failed · source: ${tag()} · ${(err as Error)?.message ?? err}`);
    setState({
      phase: "failed",
      detail: "Open LifeLink and send the alert manually.",
    });
    if (canNotify()) {
      await post(
        "Could not send emergency alert",
        "Open LifeLink and send the alert manually.",
        false
      ).catch(() => {});
    }
  } finally {
    sosSending = false;
    scheduleIdleReset(8000);
    finish();
  }
}

/** Sends the alert if the countdown has run out. Safe to call as often as you like. */
export async function tickPendingSOS() {
  if (sosDeadline === null || sosSending) return;
  if (Date.now() < sosDeadline) return;
  await sendCrashAlertNow("timeout");
}

/**
 * A crash was detected (app open or in the background). Shows the
 * "Are you OK?" notification + prompt and starts the 10 s countdown.
 * `done` is called when the check is over so detection can re-arm.
 */
export async function startCrashCheck(
  done: () => void,
  options: { test?: boolean; trigger?: TriggerInfo } = {}
) {
  if (sosDeadline !== null || sosSending) {
    done();
    return;
  }

  onFinished = done;
  isTest = !!options.test;
  trigger = options.trigger ?? null;
  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }

  // Start the countdown first, so it runs even if showing the notification fails.
  sosDeadline = Date.now() + SOS_DELAY_MS;
  setState({ phase: "counting", deadline: sosDeadline, test: isTest, detail: undefined });
  dlog(
    `⏱️ Safety check started (${SAFETY_CHECK_SECONDS}s) · source: ${sourceDetail(trigger)}${isTest ? " [test]" : ""}`
  );

  // Tells the server (fail-safe). Not awaited: the countdown must not wait for it.
  registration = isTest ? Promise.resolve(null) : registerWithServer();

  // In-app tick for when the background service is not running.
  if (uiTicker) clearInterval(uiTicker);
  uiTicker = setInterval(() => {
    tickPendingSOS().catch(() => {});
  }, 500);

  if (canNotify()) {
    try {
      await ensureSetup();
      alertNotificationId = await post(
        "🚨 Are you OK?",
        `Possible crash detected. Tap “I'm OK” within ${SAFETY_CHECK_SECONDS} seconds or we'll alert your emergency contacts.`,
        true,
        { test: isTest }
      );
      dlog(`🔔 Safety-check notification shown · source: ${tag()}`);
    } catch (err) {
      dlog(`⚠️ Notification failed: ${(err as Error)?.message ?? err}`);
    }
  }
}

/**
 * Listens for taps on the safety-check notification.
 *  - "I'm OK"        -> cancel
 *  - "Send help now" -> send immediately
 *  - tapping the body -> just opens the app (the on-screen prompt is there)
 * Returns an unsubscribe function. No-op in Expo Go.
 */
// One shared subscription, however many callers (the app's bootstrap component
// and the background service both register). Handlers are idempotent anyway.
let listenerRefs = 0;
let listenerSub: { remove: () => void } | null = null;
let listenerStarting = false;

export function registerCrashNotificationListener() {
  if (!canNotify()) return () => {};

  listenerRefs++;

  if (!listenerSub && !listenerStarting) {
    listenerStarting = true;
    notifications()
      .then((N) => {
        listenerStarting = false;
        if (listenerRefs === 0 || listenerSub) return;
        const handle = (response: any) => {
          if (response?.notification?.request?.content?.data?.type !== "crash") return;
          if (response.actionIdentifier === ACTION_SAFE) {
            cancelPendingBackgroundSOS();
          } else if (response.actionIdentifier === ACTION_SEND) {
            sendCrashAlertNow("user");
          }
          // Default tap: app opens, the prompt is already showing.
        };
        listenerSub = N.addNotificationResponseReceivedListener(handle);
        N.getLastNotificationResponseAsync()
          .then((r) => r && handle(r))
          .catch(() => {});
      })
      .catch(() => {
        listenerStarting = false;
      });
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    listenerRefs = Math.max(0, listenerRefs - 1);
    if (listenerRefs === 0) {
      listenerSub?.remove();
      listenerSub = null;
    }
  };
}

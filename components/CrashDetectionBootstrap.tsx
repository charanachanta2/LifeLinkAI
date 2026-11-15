import { useEffect } from "react";
import { AppState } from "react-native";
import CrashCheckOverlay from "@/components/CrashCheckOverlay";
import { useAuth } from "@/context/AuthContext";
import { restoreBackgroundDetection } from "@/utils/BackgroundDetection";
import {
  prepareCrashAlerts,
  registerCrashNotificationListener,
  tickPendingSOS,
} from "@/utils/CrashNotifications";

/**
 * Render once inside <AuthProvider> (app/_layout.tsx). It
 *  - restarts background detection after the user logs in, if it was on
 *  - handles the buttons on the "Are you OK?" notification
 *  - shows the on-screen "Are you OK?" prompt when the app is open
 * Does nothing visible until a crash is detected.
 */
export default function CrashDetectionBootstrap() {
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn) restoreBackgroundDetection().catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => registerCrashNotificationListener(), []);

  // Pre-load notification + sign-in code so the alert shows instantly.
  useEffect(() => {
    if (isLoggedIn) prepareCrashAlerts().catch(() => {});
  }, [isLoggedIn]);

  // Catch-up: if the countdown ran out while the phone was asleep, send now.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") tickPendingSOS().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  return <CrashCheckOverlay />;
}

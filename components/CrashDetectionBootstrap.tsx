import { router } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { restoreBackgroundDetection } from "@/utils/BackgroundDetection";
import { registerCrashNotificationListener } from "@/utils/CrashNotifications";

/**
 * Render once inside <AuthProvider> (app/_layout.tsx). It
 *  - restarts background detection after the user logs in, if it was on
 *  - opens the emergency screen when the crash notification is tapped
 * Renders nothing; does nothing in Expo Go.
 */
export default function CrashDetectionBootstrap() {
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn) restoreBackgroundDetection().catch(() => {});
  }, [isLoggedIn]);

  useEffect(
    () =>
      registerCrashNotificationListener(() => {
        // Small delay so navigation is ready on a cold start from the tap.
        setTimeout(() => {
          try {
            router.push("/emergency" as any);
          } catch {}
        }, 400);
      }),
    []
  );

  return null;
}

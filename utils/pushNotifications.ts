import Constants from "expo-constants";
import { Platform } from "react-native";

// ============================================================
// EXPO GO DETECTION
// ============================================================
// Remote push notifications were removed from Expo Go in SDK 53 —
// they now require a development build (or a standalone/EAS build).
// See: https://docs.expo.dev/develop/development-builds/introduction/
//
// Importing `expo-notifications` at the top of a file makes it run
// module-level side effects immediately (even if you never call a
// function from it), and those side effects throw inside Expo Go.
// So we deliberately do NOT statically import it here — we only
// `import()` it lazily, and only when we're confident we're not
// running inside Expo Go.
function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

/**
 * Asks the user for notification permission (if not already granted)
 * and returns an Expo push token, or null if unavailable — e.g.
 * running in Expo Go, a simulator, or the user denied permission.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (isExpoGo()) {
    console.log(
      "Push notifications skipped: not supported in Expo Go (SDK 53+). " +
        "Build a development client to enable push — see " +
        "https://docs.expo.dev/develop/development-builds/introduction/"
    );
    return null;
  }

  try {
    // Lazy imports: these modules are only loaded/executed here,
    // never at app boot, so Expo Go never touches them.
    const [{ default: Device }, Notifications] = await Promise.all([
      import("expo-device"),
      import("expo-notifications"),
    ]);

    if (!Device.isDevice) {
      console.log("Push notifications require a physical device.");
      return null;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission not granted.");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#DC2626",
      });
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    return tokenResponse.data;
  } catch (err) {
    console.warn("Push notification setup failed (non-fatal):", err);
    return null;
  }
}
// Expo config plugin: makes the Android manifest ready for the always-on
// accident-detection foreground service.
//  - declares the permissions Android 13/14+ requires
//  - gives react-native-background-actions' service a foregroundServiceType
//    (Android 14+ crashes the service without one)
const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

const PERMISSIONS = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_LOCATION",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.WAKE_LOCK",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
];

const SERVICE_NAME = "com.asterinet.react.bgactions.RNBackgroundActionsTask";

module.exports = function withBackgroundDetection(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    manifest["uses-permission"] = manifest["uses-permission"] || [];
    for (const name of PERMISSIONS) {
      const exists = manifest["uses-permission"].some(
        (p) => p.$ && p.$["android:name"] === name
      );
      if (!exists) manifest["uses-permission"].push({ $: { "android:name": name } });
    }

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.service = app.service || [];
    let service = app.service.find((s) => s.$ && s.$["android:name"] === SERVICE_NAME);
    if (!service) {
      service = { $: { "android:name": SERVICE_NAME } };
      app.service.push(service);
    }
    service.$["android:foregroundServiceType"] = "location";
    service.$["android:exported"] = "false";

    return cfg;
  });
};

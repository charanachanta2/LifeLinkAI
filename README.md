# LifeLink — changes (extract over your project folder)

Extract this zip INTO your project root (D:\ProjectsMain\LifeLink) and allow overwrite.
It only contains files that changed, so your newer files (config/firebase.ts,
profile.tsx, etc.) are not touched.

## Files
- app/login.tsx                    Google button (Expo-Go safe)
- context/AuthContext.tsx          googleLogin now returns the user
- config/google.ts                 reads EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
- plugins/withBackgroundDetection.js   Android manifest setup (service type + permissions)
- utils/BackgroundCrashMonitor.ts, BackgroundDetection.ts, CrashNotifications.ts,
  EmergencyManager.ts, SensorManager.ts   background accident detection
- components/BackgroundDetectionCard.tsx, CrashDetectionBootstrap.tsx
- app.json                         MERGE, don't blindly overwrite if you changed yours:
    * android.googleServicesFile = ./google-services.json
    * ios.bundleIdentifier = com.charanachanta2.LifeLink
    * plugins += "@react-native-google-signin/google-signin", "./plugins/withBackgroundDetection"

## app/_layout.tsx and app/profile.tsx (edits already applied)
Both files are included with the two additions done (<CrashDetectionBootstrap />
in _layout, <BackgroundDetectionCard /> in profile, above Emergency Contacts).
They are based on the project zip you sent. If your local copies have extra
changes, merge just those lines instead of overwriting.

## Install (once)
   npx expo install @react-native-google-signin/google-signin
   (expo-notifications, expo-location, expo-sensors, expo-constants,
    @react-native-async-storage/async-storage and react-native-background-actions
    are already in your package.json)

## Build (once, after Firebase setup)
   eas build --platform android --profile development
   then: npx expo start --dev-client

## Expo Go
Works without errors: Google button shows (tap explains it needs the app build);
Settings card shows the background switch disabled with a message.

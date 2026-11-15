// Web client ID of the Google provider in Firebase
// (Authentication -> Sign-in method -> Google -> Web SDK configuration).
// Read from the env variable so your existing .env value is used.
// NOTE: EAS cloud builds do not see a gitignored .env. Either register the
// variable with EAS (see steps) or paste the ID into FALLBACK below. The ID
// is a public identifier, not a secret.
const FALLBACK = "";

export const GOOGLE_WEB_CLIENT_ID: string =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || FALLBACK;

if (!GOOGLE_WEB_CLIENT_ID) {
  console.warn(
    "Google web client ID is missing: set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (EAS env) or FALLBACK in config/google.ts"
  );
}